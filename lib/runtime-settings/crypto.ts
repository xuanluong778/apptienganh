import crypto from "crypto";

const IV_LEN = 16;
const TAG_LEN = 16;
const SCRYPT_SALT = "apptienganh_app_settings_v1";

function deriveKey(master: string): Buffer {
  return crypto.scryptSync(master, SCRYPT_SALT, 32);
}

export function encryptSettingValue(plain: string, masterSecret: string): string {
  const key = deriveKey(masterSecret);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSettingValue(blob: string, masterSecret: string): string {
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error("invalid_cipher");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const key = deriveKey(masterSecret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hasMasterSecret(): boolean {
  return Boolean(process.env.APP_SETTINGS_SECRET?.trim());
}

export function getMasterSecret(): string | null {
  return process.env.APP_SETTINGS_SECRET?.trim() || null;
}
