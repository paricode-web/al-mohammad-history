"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import type { Highlight } from "@/data/history";
import { useLocale } from "@/i18n/LocaleProvider";
import { numberLocale, toNumber } from "@/i18n/numbers";

const EASE = [0.22, 1, 0.36, 1] as const;

function useCount(text: string, run: boolean) {
  const parsed = useMemo(() => {
    const match = text.match(/^([۰-۹٠-٩0-9]+)(.*)$/);

    return match
      ? { target: toNumber(match[1]), suffix: match[2] }
      : null;
  }, [text]);

  const isNumber = parsed !== null;
  const target = parsed?.target ?? 0;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isNumber || !run) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      setCount(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const duration = 1400;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setCount(Math.round(target * eased));

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [isNumber, run, target]);

  return { count, suffix: parsed?.suffix ?? "", isNumber };
}

function GlassCard({ h, index }: { h: Highlight; index: number }) {
  const { locale, dir } = useLocale();
  const [seen, setSeen] = useState(false);
  const { count, suffix, isNumber } = useCount(h.title, seen);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      dir={dir}
      initial={{
        opacity: 0,
        x: reduceMotion ? 0 : index % 2 === 0 ? -16 : 16,
        y: reduceMotion ? 0 : 14,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE }}
      onViewportEnter={() => setSeen(true)}
      className="relative z-10 w-[88%] max-w-none overflow-hidden rounded-[28px] bg-[#F2F4F6]/5 py-8 ps-14 pe-5 text-start backdrop-blur-md sm:w-[84%] sm:py-10 sm:ps-16 sm:pe-8 md:w-[78%] lg:w-full lg:max-w-[520px] lg:px-8 lg:py-11 lg:text-center"
    >
      {/* نقطه اتصال مسیر */}
      <span
        data-line-path-point={index}
        aria-hidden="true"
        className="pointer-events-none absolute start-8 top-1/2 h-px w-px lg:start-1/2"
      />

      {/* بازتاب شیشه‌ای */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(242,244,246,0.10)_0%,rgba(242,244,246,0.03)_25%,transparent_48%,rgba(242,244,246,0.02)_75%,rgba(242,244,246,0.08)_100%)]"
      />

      <div className="relative z-10">
        <h3
          className={`font-bold leading-tight tracking-tight text-[#F2F4F6] ${
            isNumber
              ? "text-4xl sm:text-5xl lg:text-6xl"
              : "text-xl leading-snug sm:text-2xl lg:text-3xl"
          }`}
        >
          {isNumber ? (
            <>
              {count.toLocaleString(numberLocale[locale])}
              {suffix}
            </>
          ) : (
            h.title
          )}
        </h3>

        <div className="me-auto mt-4 h-px w-10 bg-[#C5AA76]/70 sm:mt-5 lg:mx-auto" />

        <div className="mt-5 flex max-w-2xl flex-col items-start gap-4 sm:mt-6 sm:gap-5 lg:mx-auto lg:items-center">
          {h.blocks.map((block, i) => (
            <div key={i} className="w-full">
              {block.heading && (
                <h4 className="mb-1.5 text-[15px] font-semibold leading-7 text-[#F2F4F6] sm:mb-2 sm:text-lg sm:leading-8">
                  {block.heading}
                </h4>
              )}

              <p className="text-sm leading-7 text-[#C4CED8] sm:text-base sm:leading-8">
                {block.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function Highlights() {
  const { content, dir } = useLocale();

  if (!content.highlights.length) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="highlights"
        dir={dir}
        aria-label={content.ui.sections.highlights}
        className="relative bg-[#001C3A] py-14 text-[#F2F4F6] sm:py-20 md:py-24 lg:py-28"
      >
        <div className="page-container mx-auto">
          <div className="relative mx-auto w-full max-w-6xl">
            <div dir="ltr" className="flex flex-col">
              {content.highlights.map((highlight, index) => (
                <div
                  key={`${highlight.title}-${index}`}
                  className={`flex w-full py-3 sm:py-5 lg:py-8 ${
                    index % 2 === 0 ? "justify-start" : "justify-end"
                  }`}
                >
                  <GlassCard h={highlight} index={index} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
