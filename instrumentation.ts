export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { warmRuntimeSettingsCache } = await import("@/lib/runtime-settings/cache");
      await warmRuntimeSettingsCache();
    } catch (err) {
      console.error("[instrumentation] warmRuntimeSettingsCache failed", err);
    }
    try {
      const { startOtpRegisterMailWorker } = await import("@/lib/otp-queue/otp-register-mail");
      startOtpRegisterMailWorker();
    } catch (err) {
      console.error("[instrumentation] OTP email queue worker failed", err);
    }
  }
}
