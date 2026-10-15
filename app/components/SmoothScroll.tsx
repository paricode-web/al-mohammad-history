"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true, // خودش حلقه انیمیشن رو اجرا می‌کنه
      lerp: 0.08,    // کمتر = نرم‌تر و سنگین‌تر (پیش‌فرض ۰٫۱)
      anchors: true, // لینک‌های #id هم نرم اسکرول بشن
    });

    return () => lenis.destroy();
  }, []);

  return null;
}