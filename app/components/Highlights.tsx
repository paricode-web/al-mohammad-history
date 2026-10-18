
"use client";

import { useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import type { Highlight } from "@/data/history";
import { useLocale } from "@/i18n/LocaleProvider";
import { numberLocale, toNumber } from "@/i18n/numbers";

const EASE = [0.22, 1, 0.36, 1] as const;

function useCount(text: string, run: boolean) {
  const match = text.match(/^([۰-۹٠-٩0-9]+)(.*)$/);
  const target = match ? toNumber(match[1]) : 0;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!match || !run) return;

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
  }, [run, target]);

  return {
    count,
    suffix: match ? match[2] : "",
    isNumber: !!match,
  };
}

function GlassCard({
  h,
  index,
}: {
  h: Highlight;
  index: number;
}) {
  const { locale, dir } = useLocale();
  const [seen, setSeen] = useState(false);
  const { count, suffix, isNumber } = useCount(h.title, seen);
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      dir={dir}
      initial={{
        opacity: 0,
        x: reduceMotion ? 0 : index % 2 === 0 ? -28 : 28,
        y: reduceMotion ? 0 : 14,
      }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.7,
        ease: EASE,
        delay: Math.min(index * 0.06, 0.24),
      }}
      onViewportEnter={() => setSeen(true)}
      className="group relative w-full max-w-[520px] overflow-hidden rounded-[28px] border border-white/90 bg-white/55 px-5 py-9 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(120,113,108,0.10),0_8px_32px_rgba(41,37,36,0.06)] backdrop-blur-2xl transition-[border-color,background-color,box-shadow,transform] duration-500 hover:-translate-y-1 hover:border-white hover:bg-white/75 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_16px_40px_rgba(41,37,36,0.09)] sm:px-8 sm:py-11"
    >
      {/* Glass reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.2)_25%,transparent_48%,rgba(214,211,209,0.08)_75%,rgba(255,255,255,0.7)_100%)]"
      />

      {/* Moving reflection */}
      {!reduceMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-1/2 -left-1/2 z-0 w-1/3 rotate-[20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 blur-md group-hover:opacity-100"
          animate={{ x: ["0%", "360%"] }}
          transition={{
            duration: 2.2,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      )}

      {/* Glass rim */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/70"
      />

      <div className="relative z-10">
        <h3
          className={`font-bold leading-tight tracking-tight text-[#162C6F] transition-colors duration-300 group-hover:text-[#243F88] ${
            isNumber
              ? "text-4xl sm:text-5xl md:text-6xl"
              : "text-xl sm:text-2xl md:text-3xl"
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

        <div className="mx-auto mt-5 h-px w-10 bg-stone-400/70 transition-all duration-500 group-hover:w-16 group-hover:bg-[#162C6F]/60" />

        <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-5">
          {h.blocks.map((block, i) => (
            <div key={i} className="w-full">
              {block.heading && (
                <h4 className="mb-2 text-base font-semibold leading-8 text-[#162C6F] sm:text-lg">
                  {block.heading}
                </h4>
              )}

              <p className="text-sm leading-8 text-stone-600 sm:text-base">
                {block.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function AchievementPath({ count }: { count: number }) {
  const pathRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: pathRef,
    offset: ["start 75%", "end 55%"],
  });

  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const points = Array.from({ length: count }, (_, index) => ({
    x: index % 2 === 0 ? 180 : 820,
    y: 70 + index * 300,
  }));

  const path = points
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = points[index - 1];
      const middleY = (previous.y + point.y) / 2;

      return `C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
    })
    .join(" ");

  return (
    <div
      ref={pathRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
    >
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 1000 ${Math.max(1, 140 + (count - 1) * 300)}`}
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Subtle base path */}
        <path
          d={path}
          stroke="#162C6F"
          strokeOpacity="0.10"
          strokeWidth="1.5"
          strokeDasharray="4 8"
          strokeLinecap="round"
        />

        {/* Animated path */}
        <motion.path
          d={path}
          stroke="#162C6F"
          strokeOpacity="0.6"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            pathLength: reduceMotion ? 1 : pathLength,
          }}
        />

        {/* Gold connection points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="8"
              fill="#C5AA76"
              fillOpacity="0.12"
            />

            <motion.circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#C5AA76"
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: index * 0.12,
                ease: EASE,
              }}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
              }}
            />
          </g>
        ))}
      </svg>
    </div>
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
        className="relative overflow-hidden bg-white py-16 sm:py-20 md:py-28"
      >
        <div className="page-container mx-auto">
          <div className="relative mx-auto w-full max-w-6xl">
            <AchievementPath count={content.highlights.length} />

            <div dir="ltr" className="relative z-10 flex flex-col">
              {content.highlights.map((highlight, index) => (
                <div
                  key={`${highlight.title}-${index}`}
                  className={`w-full py-5 sm:py-8 ${
                    index % 2 === 0
                      ? "flex justify-start"
                      : "flex justify-end"
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
