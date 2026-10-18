"use client";

import { useLayoutEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Dot({
  label,
  position = "mid",
}: {
  label: string;
  position?: "mid" | "start" | "end";
}) {
  const pos =
    position === "mid"
      ? "top-0 lg:top-1/2 lg:-translate-y-1/2"
      : position === "start"
        ? "top-0"
        : "bottom-0";

  return (
    <div
      className={`timeline-dot absolute start-0 z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[#162C6F]/15 bg-white text-sm font-semibold text-[#162C6F] shadow-sm lg:start-1/2 lg:h-20 lg:w-20 lg:text-base rtl:lg:translate-x-1/2 ltr:lg:-translate-x-1/2 ${pos}`}
    >
      {label}
    </div>
  );
}

export default function Timeline() {
  const { history } = useLocale().content;
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section || !history.length) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--brand-accent").trim() || "#C5AA76";
    const headerBg = css.getPropertyValue("--brand-header").trim() || "#001C3A";

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".timeline-dot").forEach((dot) => {
        gsap.fromTo(
          dot,
          {
            boxShadow: `0 0 0 0 ${hexToRgba(accent, 0)}, 0 0 0 0 ${hexToRgba(accent, 0)}`,
          },
          {
            backgroundColor: accent,
            borderColor: accent,
            color: headerBg,
            boxShadow: `0 0 0 8px ${hexToRgba(accent, 0.15)}, 0 0 40px ${hexToRgba(accent, 0.25)}`,
            ease: "none",
            scrollTrigger: {
              trigger: dot,
              start: "center 66%",
              end: "center 56%",
              scrub: true,
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>(".timeline-content").forEach((content) => {
        gsap.from(content.children, {
          y: 24,
          opacity: 0,
          filter: "blur(6px)",
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "filter",
          scrollTrigger: {
            trigger: content,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, section);

    const refresh = () => ScrollTrigger.refresh();

    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
    };
  }, [history.length]);

  return (
    <section
      id="history"
      ref={sectionRef}
      className="overflow-hidden bg-white py-16 text-[#162C6F] sm:py-24 lg:py-32"
    >
      <div className="page-container">
        <div className="relative mx-auto max-w-5xl">
          {/* خط پایه‌ی تایم‌لاین؛ خط پرشونده را SiteVisualPath روی همه‌ی اندازه‌ها می‌کشد.
              موبایل و تبلت: ریل کنار صفحه (start-8) | دسکتاپ (lg+): وسط صفحه */}
          <div className="absolute bottom-0 start-8 top-0 w-px bg-[#162C6F]/10 lg:start-1/2">
            <span
              data-line-anchor="timeline-start"
              aria-hidden="true"
              className="absolute left-0 top-0 h-px w-px"
            />

            <span
              data-line-anchor="timeline-connection"
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-px w-px"
            />
          </div>

          <ol className="space-y-14 sm:space-y-20 lg:space-y-28">
            {history.map((item, i) => {
              const textFirst = i % 2 === 0;
              const isRange = !!item.yearEnd;

              return (
                <li
                  key={`${item.year}-${i}`}
                  className={`relative grid grid-cols-1 items-center gap-6 ps-24 lg:grid-cols-2 lg:gap-24 lg:ps-0 ${
                    isRange ? "py-20 lg:py-28" : ""
                  }`}
                >
                  {isRange && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 start-8 z-0 w-0.5 bg-accent/40 lg:start-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2"
                    />
                  )}

                  {isRange ? (
                    <>
                      <Dot label={item.year} position="start" />
                      <Dot label={item.yearEnd!} position="end" />
                    </>
                  ) : (
                    <Dot label={item.year} />
                  )}

                  {/* متن رویداد */}
                  <div
                    className={
                      textFirst
                        ? "lg:order-1 lg:flex lg:justify-end"
                        : "lg:order-2 lg:flex lg:justify-start"
                    }
                  >
                    <div className="group w-full max-w-xl px-0 pb-2 pt-3 lg:px-8 lg:pb-6 lg:pt-12">
                      <div className="timeline-content">
                        <span
                          aria-hidden="true"
                          className="block h-px w-8 bg-accent transition-all duration-500 group-hover:w-16"
                        />

                        <h3 className="mt-4 text-xl font-bold tracking-tight text-[#162C6F] sm:mt-5 sm:text-2xl lg:text-3xl">
                          {item.title}
                        </h3>

                        {item.paragraphs.map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="mt-3 text-[15px] leading-7 text-[#162C6F]/70 transition-colors duration-500 group-hover:text-[#162C6F]/90 sm:mt-4 sm:text-base sm:leading-8"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* تصویر رویداد */}
                  <div className={textFirst ? "lg:order-2" : "lg:order-1"}>
                    <div className="group/img overflow-hidden rounded-xl border border-[#162C6F]/10 bg-[#F7F8FA]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                          onLoad={() => ScrollTrigger.refresh()}
                          className="aspect-[4/3] w-full object-cover opacity-95 saturate-75 transition duration-700 group-hover/img:scale-105 group-hover/img:opacity-100 group-hover/img:saturate-100 lg:aspect-auto"
                        />
                      ) : (
                        <div className="aspect-[4/3] w-full bg-[#F7F8FA]" />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
