"use client";

import { usePathname } from "next/navigation";
import { LESSON_FLOW_STEPS, getFlowStepIndex } from "@/lib/beego/learning-flow";

export default function LessonFlowBar() {
  const pathname = usePathname();
  const current = getFlowStepIndex(pathname);

  return (
    <div className="beego-lesson-flow" aria-label="Các bước học bài">
      {LESSON_FLOW_STEPS.map((step, i) => (
        <span
          key={step.id}
          className={`beego-lesson-flow-step ${i < current ? "beego-lesson-flow-step--done" : ""} ${i === current ? "beego-lesson-flow-step--current" : ""}`}
        >
          {i < current ? "✓ " : ""}
          {step.label}
        </span>
      ))}
    </div>
  );
}
