"use client";

import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { highlights } from "@/data/history";

const faToNum = (s: string) =>
  Number(s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));

function useCount(text: string, run: boolean) {
  const m = text.match(/^([۰-۹0-9]+)(.*)$/);
  const target = m ? faToNum(m[1]) : 0;
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
  }, [run, target]);

  return { n, suffix: m ? m[2] : "", isNumber: !!m };
}


function Card({
  h,
  index,
}: {
  h: (typeof highlights)[number];
  index: number;
}) {
  const [seen, setSeen] = useState(false);
  const { n, suffix, isNumber } = useCount(h.title, seen);

  return (
  
<motion.div
  className="sticky top-28 h-fit"
  style={{ zIndex: index + 1 }}
  initial={{ opacity: 0, x: 100 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{
    once: true,
    amount: 0.15,
    margin: "0px 0px -10% 0px",
  }}
  transition={{
    duration: 0.8,
    ease: [0.22, 1, 0.36, 1],
  }}
  onViewportEnter={() => setSeen(true)}
>

      <article className="group relative min-h-[100px] overflow-hidden border border-line border-t-4 border-t-gold bg-tint p-5 shadow-xl shadow-brand/10 sm:min-h-[320px] sm:p-6 md:min-h-[340px] md:p-8">
       
        <img
          src="/images/brand/logo-fa.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 -left-6 h-40 w-40 object-contain opacity-[0.06] transition-transform duration-700 group-hover:-translate-y-2 group-hover:rotate-6"
        />

        <div className="relative flex min-h-[260px] flex-col items-center justify-center text-center">
          <span className="mb-8 block text-sm text-brand/50">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(highlights.length).padStart(2, "0")}
          </span>

          <h3 className="mb-8 text-3xl font-extrabold text-brand-2 md:text-5xl">
            {isNumber ? (
              <>
                {n.toLocaleString("fa-IR")}
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
                  <p className="mb-2 text-lg font-bold text-brand">
                    {b.heading}
                  </p>
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
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="highlights"
        className="page-container py-24"
      >
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="mb-5 text-3xl font-bold text-brand md:text-4xl">
            دستاوردهای شاخص
          </h2>

         
        </motion.div>

        <div className="relative space-y-[35vh] pb-[35vh]">
          {highlights.map((h, i) => (
            <Card key={h.title} h={h} index={i} />
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
