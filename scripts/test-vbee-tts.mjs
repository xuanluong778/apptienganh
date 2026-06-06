import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i < 0) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const token = process.env.VBEE_API_TOKEN || process.env.VBEE_TOKEN || "";
const appId = process.env.VBEE_APP_ID || "";
let apiUrl = process.env.VBEE_API_URL || "";
if (!apiUrl && process.env.VBEE_API_BASE) {
  const base = process.env.VBEE_API_BASE.replace(/\/$/, "");
  apiUrl = base.endsWith("/tts") ? base : `${base}/tts`;
}
if (!apiUrl || !apiUrl.includes("api.vbee.vn")) apiUrl = "https://api.vbee.vn/v1/tts";
const voice = process.env.VBEE_VOICE_CODE || "hn_female_ngochuyen_full_48k-fhg";

console.log("VBEE check");
console.log("- has token:", Boolean(token));
console.log("- has app id:", Boolean(appId));
console.log("- api url:", apiUrl);

if (!token || !appId) {
  console.error("FAIL: missing VBEE_TOKEN/VBEE_API_TOKEN or VBEE_APP_ID");
  process.exit(2);
}

const res = await fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "App-Id": appId,
    "x-app-id": appId,
  },
  body: JSON.stringify({
    text: "Xin chao, day la thu nghiem VBEE.",
    mode: "sync",
    voiceCode: voice,
    outputFormat: "mp3",
    speed: 1.0,
  }),
});

const ct = res.headers.get("content-type") || "";
console.log("- http status:", res.status);
console.log("- content-type:", ct);

if (!res.ok) {
  const body = await res.text();
  console.error("FAIL:", body.slice(0, 600));
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
console.log("- audio bytes:", buf.length);
console.log(buf.length > 500 ? "OK: VBEE returned audio" : "FAIL: audio too small");
