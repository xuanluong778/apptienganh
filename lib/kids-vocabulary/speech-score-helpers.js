/** Thông báo lỗi Web Speech (tiếng Việt). */
export function speechErrorVi(code) {
  const c = String(code || "");
  if (c === "not-allowed") return "Micro bị chặn — bấm biểu tượng khóa trên thanh địa chỉ → Cho phép micro.";
  if (c === "network")
    return "Lỗi mạng: nhận dạng giọng cần internet. Kiểm tra Wi-Fi; với http://… hãy thử https:// hoặc localhost.";
  if (c === "service-not-allowed") return "Trình duyệt tắt nhận dạng giọng — kiểm tra cài đặt quyền trang web.";
  if (c === "audio-capture") return "Không lấy được âm thanh micro — kiểm tra micro đang hoạt động.";
  if (c === "start-failed") return "Không bật được máy nghe — đợi vài giây rồi bấm lại.";
  if (c === "unsupported") return "Trình duyệt không hỗ trợ nhận dạng giọng nói — thử Chrome/Edge.";
  return "Máy chưa nghe rõ — đọc to hơn hoặc thử lại.";
}

/** Xin micro một nhịp (một số trình duyệt cần trước khi SpeechRecognition ổn định). */
export async function primeMicrophone() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return true;
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    s.getTracks().forEach((t) => t.stop());
    await new Promise((r) => setTimeout(r, 200));
    return true;
  } catch (_e) {
    return false;
  }
}
