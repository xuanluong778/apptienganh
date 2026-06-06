import { Suspense } from "react";
import BeegoOnboarding from "@/components/onboarding/BeegoOnboarding";

export const metadata = {
  title: "Bắt đầu với Beego | beego.vn",
  description: "Chọn mục tiêu học tiếng Anh và cá nhân hóa lộ trình trên Beego.",
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="beego-onboarding"><p style={{ fontWeight: 700 }}>Đang tải…</p></div>}>
      <BeegoOnboarding />
    </Suspense>
  );
}
