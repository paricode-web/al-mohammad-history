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

    return match ? { target: toNumber(match[1]), suffix: match[2] } : null;
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

      if (progress < 1) raf = requestAnimationFrame(tick);
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
        // موبایل و تبلت: ورود از پایین؛ دسکتاپ: از چپ و راست (در lg با CSS معنی پیدا می‌کند)
        x: reduceMotion ? 0 : index % 2 === 0 ? -16 : 16,
        y: reduceMotion ? 0 : 14,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE }}
      onViewportEnter={() => setSeen(true)}
      // موبایل/تبلت: کارت تمام‌عرض با ریل خط در کنار (ps بزرگ‌تر) و متن start-align
      // lg+: کارت ۵۲۰px یک‌درمیان چپ و راست و متن وسط‌چین
      // z-10: کارت بالاتر از خط سراسری (z-5)؛ blur کم تا خط از زیر شیشه محو دیده شود
      className="group relative z-10 w-full max-w-none overflow-hidden rounded-[28px] border border-white/90 bg-white/45 py-8 ps-14 pe-5 text-start shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(120,113,108,0.10),0_8px_32px_rgba(41,37,36,0.06)] backdrop-blur-md transition-[border-color,background-color,box-shadow,transform] duration-500 hover:bg-white/70 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_16px_40px_rgba(41,37,36,0.09)] sm:py-10 sm:ps-16 sm:pe-8 lg:max-w-[520px] lg:px-8 lg:py-11 lg:text-center lg:hover:-translate-y-1"
    >
      {/* نقطه‌ی مخفی مسیر: موبایل/تبلت روی ریل (start-8، هم‌تراز خط تایم‌لاین)، دسکتاپ مرکز کارت */}
      <span
        data-line-path-point={index}
        aria-hidden="true"
        className="pointer-events-none absolute start-8 top-1/2 h-px w-px lg:start-1/2"
      />

      {/* بازتاب شیشه */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.15)_25%,transparent_48%,rgba(214,211,209,0.08)_75%,rgba(255,255,255,0.6)_100%)]"
      />

      {/* بازتاب متحرک: فقط با هاور (دسکتاپ) و با CSS */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-y-1/2 left-0 z-0 hidden w-1/3 -translate-x-full rotate-[20deg] bg-linear-to-r from-transparent via-white/70 to-transparent opacity-0 blur-md transition-[translate,opacity] duration-[1100ms] ease-out group-hover:translate-x-[300%] group-hover:opacity-100 motion-reduce:hidden lg:block"
      />

      {/* لبه‌ی شیشه */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/70"
      />

      <div className="relative z-10">
        <h3
          className={`font-bold leading-tight tracking-tight text-[#162C6F] transition-colors duration-300 group-hover:text-[#243F88] ${
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

        <div className="me-auto mt-4 h-px w-10 bg-stone/70 transition-all duration-500 group-hover:w-16 group-hover:bg-[#162C6F]/60 sm:mt-5 lg:mx-auto" />

        <div className="mt-5 flex max-w-2xl flex-col items-start gap-4 sm:mt-6 sm:gap-5 lg:mx-auto lg:items-center">
          {h.blocks.map((block, i) => (
            <div key={i} className="w-full">
              {block.heading && (
                <h4 className="mb-1.5 text-[15px] font-semibold leading-7 text-[#162C6F] sm:mb-2 sm:text-lg sm:leading-8">
                  {block.heading}
                </h4>
              )}

              <p className="text-sm leading-7 text-[#162C6F]/70 sm:text-base sm:leading-8">
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
        className="relative bg-white py-14 sm:py-20 md:py-24 lg:py-28"
      >
        <div className="page-container mx-auto">
          <div className="relative mx-auto w-full max-w-6xl">
            <div dir="ltr" className="flex flex-col">
              {content.highlights.map((highlight, index) => (
                <div
                  key={`${highlight.title}-${index}`}
                  className={`flex w-full py-3 sm:py-5 lg:py-8 ${
                    index % 2 === 0 ? "lg:justify-start" : "lg:justify-end"
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
