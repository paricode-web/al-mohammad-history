"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  useEffect(() => {
    // لمسی: اسکرول بومی مرورگر از Lenis نرم‌تر و روی کامپوزیتور است؛
    // Lenis فقط یک حلقه‌ی rAF اضافه می‌کند. (در لپ‌تاپ‌های لمسی هم غیرفعال می‌شود.)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const lenis = new Lenis({
      autoRaf: false, // حلقه را GSAP می‌گرداند: یک ساعت برای Lenis + ScrollTrigger
      lerp: 0.08,
      anchors: true,
    });

    const onTick = (time: number) => lenis.raf(time * 1000);

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return null;
}
