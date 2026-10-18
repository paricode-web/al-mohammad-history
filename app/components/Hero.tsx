"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/i18n/LocaleProvider";

const EASE = [0.22, 1, 0.36, 1] as const;
const TITLE_WORD = "معرفی";

export default function Hero() {
  const { intro } = useLocale().content;
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-header text-white md:min-h-[70vh]">
      {/* Background image */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />

      {/* Overlay */}
      <div aria-hidden="true" className="absolute inset-0 bg-header/70" />

      <div className="page-container relative z-10 pb-16 pt-32 md:pb-24 md:pt-40">
        {/* نقطه‌ی شروع خط سراسری */}
        <div className="mb-6 flex h-2 items-center gap-2" aria-hidden="true">
          {/* anchor ثابت: مسیر سراسری از وسط همین خط شروع می‌شود */}
          <span
            data-line-anchor="visual-start"
            className="relative block h-px w-16 md:w-24"
          >
            <motion.span
              className="absolute inset-0 block origin-left bg-accent"
              initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: EASE }}
            />
          </span>

          <motion.span
            className="block h-2 w-2 rounded-full bg-accent"
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.6 }}
          />
        </div>

        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.15 }}
          className="relative z-30 mb-6 w-fit px-2 text-3xl font-bold leading-tight md:mb-8 md:text-5xl"
        >
          {intro.title.startsWith(TITLE_WORD) ? (
            <>
              <span data-line-title-word>{TITLE_WORD}</span>
              {intro.title.slice(TITLE_WORD.length)}
            </>
          ) : (
            intro.title
          )}
        </motion.h1>
      </div>
    </section>
  );
}
