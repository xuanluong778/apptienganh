import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { getSettingSync } from "@/lib/runtime-settings/cache";

const QUEUE_NAME = "otp-register-email";

function redisUrl(): string | null {
  const fromEnv = process.env.REDIS_URL?.trim();
  if (fromEnv) return fromEnv;
  return getSettingSync("REDIS_URL")?.trim() || null;
}

let queueSingleton: Queue | null = null;

function getQueue(): Queue | null {
  const url = redisUrl();
  if (!url) return null;
  if (!queueSingleton) {
    const connection = new Redis(url, { maxRetriesPerRequest: null });
    queueSingleton = new Queue(QUEUE_NAME, { connection });
  }
  return queueSingleton;
}

/**
 * Đưa gửi email OTP vào hàng đợi Redis (BullMQ). API trả về ngay, worker gửi mail sau.
 * Trả về false nếu không có Redis hoặc lỗi enqueue → caller gửi đồng bộ.
 */
export async function tryEnqueueRegisterOtpEmail(to: string, code: string): Promise<boolean> {
  try {
    const q = getQueue();
    if (!q) return false;
    await q.add(
      "send-register-otp",
      { to, code },
      {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      }
    );
    return true;
  } catch (err) {
    console.error("[otp-queue] enqueue failed", err);
    return false;
  }
}

let workerInstance: Worker | null = null;

export function startOtpRegisterMailWorker(): void {
  const g = globalThis as unknown as { __otpRegisterMailWorkerStarted?: boolean };
  if (g.__otpRegisterMailWorkerStarted) return;

  const url = redisUrl();
  if (!url) {
    console.info("[otp-queue] REDIS_URL không có — OTP email gửi đồng bộ (chậm hơn).");
    return;
  }

  const connection = new Redis(url, { maxRetriesPerRequest: null });

  workerInstance = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { deliverRegisterOtpEmail } = await import("@/lib/otp-delivery");
      const { to, code } = job.data as { to: string; code: string };
      await deliverRegisterOtpEmail(to, code);
    },
    {
      connection,
      concurrency: 4,
      limiter: { max: 20, duration: 60000 },
    }
  );

  workerInstance.on("failed", (job, err) => {
    console.error("[otp-queue] job failed", job?.id, err?.message || err);
  });

  g.__otpRegisterMailWorkerStarted = true;
  console.info("[otp-queue] Worker OTP email đã chạy (queue=%s)", QUEUE_NAME);
}
