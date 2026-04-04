import { spawn, spawnSync } from "child_process";

const targetUrl = process.env.HEALTHCHECK_URL || "http://localhost:3000/";
const intervalMs = Number(process.env.WATCHDOG_INTERVAL_MS || 15000);
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5000);
const maxFails = Number(process.env.WATCHDOG_MAX_FAILS || 3);

let child = null;
let failCount = 0;
let checkTimer = null;
let restarting = false;
let shuttingDown = false;

function log(message) {
  const ts = new Date().toISOString();
  console.log(`[watchdog ${ts}] ${message}`);
}

function killPorts(ports) {
  const uniquePorts = [...new Set(ports)].filter(Boolean);
  if (uniquePorts.length === 0) return;

  if (process.platform === "win32") {
    for (const port of uniquePorts) {
      const listResult = spawnSync("netstat", ["-ano", "-p", "tcp"], {
        encoding: "utf8",
        windowsHide: true,
      });
      const output = listResult.stdout || "";
      const pids = new Set();
      for (const rawLine of output.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || !line.includes(`:${port}`)) continue;
        if (!line.includes("LISTENING")) continue;
        const parts = line.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid) && Number(pid) !== process.pid) {
          pids.add(pid);
        }
      }

      for (const pid of pids) {
        const killResult = spawnSync("taskkill", ["/PID", pid, "/F"], {
          encoding: "utf8",
          windowsHide: true,
        });
        if (killResult.status === 0) {
          log(`killed stale process pid=${pid} on port ${port}`);
        } else {
          log(`failed to kill pid=${pid} on port ${port} (might already be gone)`);
        }
      }
    }
    return;
  }

  for (const port of uniquePorts) {
    const res = spawnSync("sh", ["-c", `lsof -ti tcp:${port}`], {
      encoding: "utf8",
    });
    const pids = (res.stdout || "")
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter((x) => /^\d+$/.test(x) && Number(x) !== process.pid);
    for (const pid of pids) {
      const killResult = spawnSync("kill", ["-9", pid], { encoding: "utf8" });
      if (killResult.status === 0) {
        log(`killed stale process pid=${pid} on port ${port}`);
      } else {
        log(`failed to kill pid=${pid} on port ${port} (might already be gone)`);
      }
    }
  }
}

function startDevServer() {
  killPorts([3000, 3001]);
  child = spawn("npm", ["run", "dev"], {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    log(`dev process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    child = null;
    if (!shuttingDown && !restarting) {
      restarting = true;
      setTimeout(() => {
        restarting = false;
        startDevServer();
      }, 1500);
    }
  });
}

async function checkHealth() {
  if (!child || restarting || shuttingDown) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (failCount > 0) {
      log(`health recovered at ${targetUrl}`);
    }
    failCount = 0;
  } catch (error) {
    failCount += 1;
    log(`health fail ${failCount}/${maxFails} at ${targetUrl} (${error.message})`);
    if (failCount >= maxFails && child) {
      log("restarting dev server...");
      restarting = true;
      failCount = 0;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child) {
          child.kill("SIGKILL");
        }
      }, 2000);
      setTimeout(() => {
        restarting = false;
        if (!shuttingDown) {
          startDevServer();
        }
      }, 3000);
    }
  } finally {
    clearTimeout(timeout);
  }
}

function shutdown() {
  shuttingDown = true;
  if (checkTimer) clearInterval(checkTimer);
  if (child) {
    child.kill("SIGTERM");
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

log(`starting watchdog for ${targetUrl}`);
startDevServer();
checkTimer = setInterval(checkHealth, intervalMs);
