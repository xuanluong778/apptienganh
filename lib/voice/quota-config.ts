import pool from "@/lib/db";
import { ensureAppSettingsTable } from "@/lib/runtime-settings/table";

export type VoiceQuotaPlanConfig = {
  maxStartsPerMin: number;
  maxConcurrentSessions: number;
  cap: {
    stt_ms_day: number;
    stt_ms_month: number;
    llm_tokens_day: number;
    llm_tokens_month: number;
    tts_bytes_day: number;
    tts_bytes_month: number;
  };
};

export type VoiceQuotaConfig = Record<string, VoiceQuotaPlanConfig>;

export function defaultVoiceQuotaConfig(): VoiceQuotaConfig {
  return {
    expired: {
      maxStartsPerMin: 25,
      maxConcurrentSessions: 1,
      cap: {
        stt_ms_day: 10 * 60 * 1000,
        stt_ms_month: 3 * 60 * 60 * 1000,
        llm_tokens_day: 3000,
        llm_tokens_month: 60000,
        tts_bytes_day: 3_000_000,
        tts_bytes_month: 80_000_000,
      },
    },
    trial: {
      maxStartsPerMin: 60,
      maxConcurrentSessions: 2,
      cap: {
        stt_ms_day: 60 * 60 * 1000,
        stt_ms_month: 20 * 60 * 60 * 1000,
        llm_tokens_day: 30000,
        llm_tokens_month: 600000,
        tts_bytes_day: 30_000_000,
        tts_bytes_month: 800_000_000,
      },
    },
    pro: {
      maxStartsPerMin: 60,
      maxConcurrentSessions: 2,
      cap: {
        stt_ms_day: 60 * 60 * 1000,
        stt_ms_month: 20 * 60 * 60 * 1000,
        llm_tokens_day: 30000,
        llm_tokens_month: 600000,
        tts_bytes_day: 30_000_000,
        tts_bytes_month: 800_000_000,
      },
    },
    vip: {
      maxStartsPerMin: 120,
      maxConcurrentSessions: 4,
      cap: {
        stt_ms_day: 6 * 60 * 60 * 1000,
        stt_ms_month: 120 * 60 * 60 * 1000,
        llm_tokens_day: 200000,
        llm_tokens_month: 4_000_000,
        tts_bytes_day: 250_000_000,
        tts_bytes_month: 5_000_000_000,
      },
    },
  };
}

function asNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function normalizePlanConfig(plan: string, input: any, fallback: VoiceQuotaPlanConfig): VoiceQuotaPlanConfig {
  const obj = input && typeof input === "object" ? input : {};
  const capIn = obj.cap && typeof obj.cap === "object" ? obj.cap : {};
  return {
    maxStartsPerMin: asNum(obj.maxStartsPerMin, fallback.maxStartsPerMin),
    maxConcurrentSessions: asNum(obj.maxConcurrentSessions, fallback.maxConcurrentSessions),
    cap: {
      stt_ms_day: asNum(capIn.stt_ms_day, fallback.cap.stt_ms_day),
      stt_ms_month: asNum(capIn.stt_ms_month, fallback.cap.stt_ms_month),
      llm_tokens_day: asNum(capIn.llm_tokens_day, fallback.cap.llm_tokens_day),
      llm_tokens_month: asNum(capIn.llm_tokens_month, fallback.cap.llm_tokens_month),
      tts_bytes_day: asNum(capIn.tts_bytes_day, fallback.cap.tts_bytes_day),
      tts_bytes_month: asNum(capIn.tts_bytes_month, fallback.cap.tts_bytes_month),
    },
  };
}

export async function getVoiceQuotaConfigFromDb(): Promise<{ config: VoiceQuotaConfig; updatedAt: string | null }> {
  const defaults = defaultVoiceQuotaConfig();
  await ensureAppSettingsTable();
  const [rows] = await pool.query(
    `SELECT setting_value, updated_at
     FROM app_settings
     WHERE setting_key = 'VOICE_QUOTA_JSON'
     LIMIT 1`
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  const raw = row?.setting_value != null ? String(row.setting_value) : "";
  const updatedAt = row?.updated_at ? new Date(row.updated_at).toISOString() : null;
  if (!raw.trim()) return { config: defaults, updatedAt };
  try {
    const parsed = JSON.parse(raw);
    const out: VoiceQuotaConfig = {};
    for (const plan of Object.keys(defaults)) {
      out[plan] = normalizePlanConfig(plan, parsed?.[plan], defaults[plan]);
    }
    return { config: out, updatedAt };
  } catch {
    return { config: defaults, updatedAt };
  }
}

export async function setVoiceQuotaConfigToDb(config: VoiceQuotaConfig): Promise<void> {
  await ensureAppSettingsTable();
  const raw = JSON.stringify(config);
  await pool.query(
    `INSERT INTO app_settings (setting_key, setting_value, is_encrypted)
     VALUES ('VOICE_QUOTA_JSON', ?, 0)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_encrypted = 0`,
    [raw]
  );
}

