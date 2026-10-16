"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true, // 
      lerp: 0.08,    // 
      anchors: true, // 
    });

    return () => lenis.destroy();
  }, []);

  return null;
}