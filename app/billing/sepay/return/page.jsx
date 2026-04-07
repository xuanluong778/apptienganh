"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SepayReturnContent() {
  const sp = useSearchParams();
  const outcome = (sp.get("outcome") || "").toLowerCase();

  let title = "Thanh toán";
  let message =
    "Bạn có thể đóng trang này hoặc quay lại ứng dụng. Nếu đã thanh toán, gói sẽ được kích hoạt tự động trong vài giây.";

  if (outcome === "success") {
    title = "Thanh toán thành công";
    message =
      "Cảm ơn bạn! Gói sẽ được kích hoạt tự động sau khi SePay xác nhận. Nếu chưa thấy gói mới, hãy tải lại trang hoặc đợi thêm vài giây.";
  } else if (outcome === "cancel") {
    title = "Đã hủy thanh toán";
    message = "Bạn đã hủy giao dịch trên cổng SePay. Có thể thử lại bất cứ lúc nào.";
  } else if (outcome === "error") {
    title = "Thanh toán không hoàn tất";
    message = "Có lỗi trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.";
  }

  return (
    <main style={{ maxWidth: 520, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{title}</h1>
      <p style={{ lineHeight: 1.6, color: "#333" }}>{message}</p>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ color: "#2563eb" }}>
          Về trang chủ
        </Link>
        {" · "}
        <Link href="/lessons" style={{ color: "#2563eb" }}>
          Bài học
        </Link>
      </p>
    </main>
  );
}

export default function SepayReturnPage() {
  return (
    <Suspense fallback={<main style={{ padding: "3rem", textAlign: "center" }}>Đang tải…</main>}>
      <SepayReturnContent />
    </Suspense>
  );
}
