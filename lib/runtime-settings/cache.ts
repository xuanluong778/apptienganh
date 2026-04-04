import pool from "@/lib/db";
import { decryptSettingValue, getMasterSecret } from "./crypto";
import { ensureAppSettingsTable } from "./table";

const snapshot = new Map<string, string>();

/**
 * Giá trị hiệu lực: nếu đã load từ DB vào snapshot thì dùng snapshot[key] (kể cả chuỗi rỗng);
 * ngược lại fallback process.env.
 */
export function getSettingSync(key: string): string | undefined {
  if (snapshot.has(key)) {
    return snapshot.get(key);
  }
  const v = process.env[key];
  return v !== undefined ? v : undefined;
}

export async function warmRuntimeSettingsCache(): Promise<void> {
  await ensureAppSettingsTable();
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value, is_encrypted FROM app_settings"
  );
  snapshot.clear();
  const master = getMasterSecret();
  for (const row of rows as { setting_key: string; setting_value: string | null; is_encrypted: number }[]) {
    const k = String(row.setting_key || "");
    if (!k) continue;
    let val = row.setting_value != null ? String(row.setting_value) : "";
    if (row.is_encrypted && master && val) {
      try {
        val = decryptSettingValue(val, master);
      } catch {
        console.error("[app_settings] decrypt failed for key:", k);
        continue;
      }
    }
    snapshot.set(k, val);
  }
}

export function clearRuntimeSettingsCache(): void {
  snapshot.clear();
}
