const targetUrl = process.env.HEALTHCHECK_URL || "http://localhost:3000/";
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 5000);

async function main() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`[health-check] FAIL ${response.status} ${targetUrl}`);
      process.exit(1);
    }

    console.log(`[health-check] OK ${response.status} ${targetUrl}`);
  } catch (error) {
    console.error(`[health-check] FAIL ${targetUrl} - ${error.message}`);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

main();
