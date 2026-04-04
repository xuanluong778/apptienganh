import { getSettingSync } from "@/lib/runtime-settings/cache";

function getAppOrigin() {
  const pub = getSettingSync("NEXT_PUBLIC_APP_URL");
  if (pub) {
    return String(pub).replace(/\/$/, "");
  }
  const app = getSettingSync("APP_URL");
  if (app) {
    return String(app).replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "";
}

export function normalizeMediaUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return "";
  }

  const appOrigin = getAppOrigin();

  if (raw.startsWith("/")) {
    return appOrigin ? `${appOrigin}${raw}` : raw;
  }

  try {
    const parsed = new URL(raw);
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (!isLocalhost) {
      return raw;
    }

    const pathWithQuery = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!appOrigin) {
      return pathWithQuery;
    }

    return `${appOrigin}${pathWithQuery}`;
  } catch (_error) {
    return raw;
  }
}
