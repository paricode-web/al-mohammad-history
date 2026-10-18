"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { MotionConfig, motion } from "motion/react";

export default function Highlights() {
  const { content, dir } = useLocale();

  if (!content.highlights.length) return null;

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="highlights"
        dir={dir}
        aria-label={content.ui.sections.highlights}
        className="page-container py-24 md:py-36"
      >
        {/* سربرگ تحریریه‌ای */}
        <div className="grid grid-cols-1 gap-8 border-b border-header/20 pb-10 md:grid-cols-[1fr_0.7fr] md:items-end md:pb-14">
          <div>
            <p className="mb-5 text-xs font-semibold tracking-[0.2em] text-golden">
              AL MOHAMMAD LAW OFFICE
            </p>

            <h2 className="max-w-2xl text-3xl font-extrabold leading-relaxed text-header md:text-5xl lg:text-6xl">
              {content.ui.sections.highlights}
            </h2>
          </div>

          <p className="max-w-lg text-sm leading-8 text-brand/70 md:justify-self-end md:text-base">
            میراثی از تجربه، تعهد حرفه‌ای و حضور مستمر در عرصه‌ی خدمات حقوقی.
          </p>
        </div>

        {/* دستاوردها؛ بدون کارت و پس‌زمینه */}
        <div className="relative">
          {content.highlights.map((item, index) => {
            const featured = index === 0;

            return (
              <motion.article
                key={item.title}
                initial={{
                  opacity: 0,
                  y: 32,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                  amount: 0.15,
                }}
                transition={{
                  duration: 0.75,
                  delay: 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`group relative grid grid-cols-[64px_minmax(0,1fr)] gap-5 py-10 md:grid-cols-[120px_minmax(0,1fr)] md:gap-10 md:py-14 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-16 ${
                  index !== content.highlights.length - 1
                    ? "border-b border-header/15"
                    : ""
                }`}
              >
                {/* شماره‌ی بزرگ */}
                <div className="relative">
                  <span
                    className={`block text-4xl font-light leading-none tracking-tighter transition-colors duration-500 md:text-6xl lg:text-8xl ${
                      featured
                        ? "text-accent"
                        : "text-header/20 group-hover:text-accent"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <motion.span
                    aria-hidden="true"
                    className="mt-5 block h-px origin-right bg-accent"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.8,
                      delay: 0.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>

                {/* عنوان و توضیحات */}
                <div className="min-w-0">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
                    <h3 className="max-w-2xl text-xl font-bold leading-relaxed text-header md:text-3xl lg:text-4xl">
                      {item.title}
                    </h3>

                    <span className="hidden pt-2 text-xs text-golden lg:block">
                      AL MOHAMMAD / {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
                    {item.blocks.map((block, blockIndex) => (
                      <div key={blockIndex}>
                        {block.heading && (
                          <h4 className="mb-3 text-base font-bold text-brand md:text-lg">
                            {block.heading}
                          </h4>
                        )}

                        <p className="max-w-xl text-sm leading-8 text-brand/75 md:text-base">
                          {block.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* پایان‌بندی مینیمال */}
        <div className="mt-10 flex items-center justify-between gap-5">
          <span className="h-px max-w-24 flex-1 bg-accent" />

          <p className="text-xs tracking-wide text-brand/50">
            {content.ui.sections.highlights}
          </p>

          <span className="h-px max-w-24 flex-1 bg-header/15" />
        </div>
      </section>
    </MotionConfig>
  );
}