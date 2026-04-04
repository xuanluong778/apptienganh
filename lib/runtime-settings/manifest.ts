export type SettingDef = {
  key: string;
  label: string;
  group: string;
  secret: boolean;
  placeholder?: string;
};

/**
 * Danh sách khóa admin được phép lưu DB — giữ đồng bộ với biến bạn dùng trong `.env.local`.
 * Khi thêm biến mới vào `.env.local`, thêm một dòng tương ứng vào đây (không gồm DATABASE_URL, ADMIN_EMAIL, APP_SETTINGS_SECRET).
 */
export const MANAGED_SETTING_KEYS: SettingDef[] = [
  { key: "OPENAI_API_KEY", label: "OpenAI API key", group: "OpenAI", secret: true },
  { key: "OPENAI_CHAT_MODEL", label: "OPENAI_CHAT_MODEL", group: "OpenAI", secret: false },

  { key: "AZURE_SPEECH_KEY", label: "Azure Speech key", group: "Phát âm", secret: true },
  { key: "AZURE_SPEECH_REGION", label: "Azure Speech region", group: "Phát âm", secret: false },

  { key: "SMTP_HOST", label: "SMTP host", group: "SMTP", secret: false },
  { key: "SMTP_PORT", label: "SMTP port", group: "SMTP", secret: false, placeholder: "587" },
  { key: "SMTP_USER", label: "SMTP user", group: "SMTP", secret: false },
  { key: "SMTP_PASSWORD", label: "SMTP password", group: "SMTP", secret: true },
  { key: "SMTP_FROM", label: "SMTP From", group: "SMTP", secret: false },
];

export const MANAGED_KEY_SET = new Set(MANAGED_SETTING_KEYS.map((d) => d.key));
