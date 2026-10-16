"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import type { Highlight } from "@/data/history";
import { useLocale } from "@/i18n/LocaleProvider";
import { numberLocale, toNumber } from "@/i18n/numbers";

function useCount(text: string, run: boolean) {
  const m = text.match(/^([۰-۹٠-٩0-9]+)(.*)$/);
  const target = m ? toNumber(m[1]) : 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!m || !run) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1400;
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target]); // eslint-disable-line react-hooks/exhaustive-deps

  return { n, suffix: m ? m[2] : "", isNumber: !!m };
}

function Card({ h, index }: { h: Highlight; index: number }) {
  const { locale, dir } = useLocale();
  const [seen, setSeen] = useState(false);
  const { n, suffix, isNumber } = useCount(h.title, seen);

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, x: dir === "rtl" ? 100 : -100 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.15,
      }}
      onViewportEnter={() => setSeen(true)}
    >
      <article className="group relative flex h-full min-h-[280px] items-center justify-center overflow-hidden border-t-4 border-t-gold bg-tint p-6 text-center transition-colors duration-500 hover:bg-white md:min-h-[340px] md:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/brand/logo-b.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 -left-1 h-40 w-40 object-contain opacity-[0.06] transition-transform duration-700 group-hover:-translate-y-2 group-hover:rotate-6"
        />

        <div className="relative w-full">
          <h3 className="mb-8 text-3xl font-extrabold text-brand-2 md:text-4xl">
            {isNumber ? (
              <>
                {n.toLocaleString(numberLocale[locale])}
                {suffix}
              </>
            ) : (
              h.title
            )}
          </h3>

          <div className="w-full space-y-6">
            {h.blocks.map((b, i) => (
              <div key={i}>
                {b.heading && (
                  <p className="mb-2 text-lg font-bold text-brand">{b.heading}</p>
                )}
                <p className="leading-8 text-brand/80">{b.text}</p>
              </div>
            ))}
          </div>
        </div>

        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1 origin-right scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
        />
      </article>
    </motion.div>
  );
}

export default function Highlights() {
  const { content } = useLocale();

  return (
    <MotionConfig reducedMotion="user">
      <section id="highlights" className="page-container overflow-x-clip py-24">
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="mb-12 text-3xl font-bold text-brand md:text-4xl">
            {content.ui.sections.highlights}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 divide-y divide-line border-x border-b border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {content.highlights.map((h, i) => (
            <Card key={h.title} h={h} index={i} />
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}