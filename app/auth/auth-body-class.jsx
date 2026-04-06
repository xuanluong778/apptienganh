"use client";

import { useEffect } from "react";

const CLS = "page-auth";

/** Gắn class lên body để ẩn nav / dock / nền xanh toàn cục chỉ trên trang đăng nhập. */
export default function AuthBodyClass() {
  useEffect(() => {
    document.body.classList.add(CLS);
    return () => {
      document.body.classList.remove(CLS);
    };
  }, []);
  return null;
}
