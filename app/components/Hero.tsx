"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/i18n/LocaleProvider";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const { intro } = useLocale().content;
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[65svh] items-center overflow-hidden bg-[#001C3A] text-[#F2F4F6] md:min-h-[70svh]">
      {/* Background image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />

      {/* Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[#001C3A]/70"
      />

      <div className="page-container relative z-10 pb-14 pt-32 sm:pb-16 md:pb-24 md:pt-40">
        {/* نقطه شروع خط */}
        <div
          className="mb-5 flex h-2 items-center gap-2 md:mb-6"
          aria-hidden="true"
        >
          <span
            data-line-anchor="visual-start"
            className="relative block h-px w-16 md:w-24"
          >
            <motion.span
              className="absolute inset-0 block origin-left bg-[#C5AA76] rtl:origin-right"
              initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE }}
            />
          </span>

          <motion.span
            className="block h-2 w-2 rounded-full bg-[#C5AA76]"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.6 }}
          />
        </div>

        {/* عنوان اصلی */}
        <motion.h1
          data-line-title-word
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.15 }}
          className="relative z-30 mb-2 w-fit max-w-3xl text-balance px-2 text-3xl font-bold leading-snug text-[#F2F4F6] sm:text-4xl md:mb-8 md:text-5xl md:leading-tight lg:text-6xl"
        >
          {intro.title}
        </motion.h1>
      </div>
    </section>
  );
}