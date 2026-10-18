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
      ? "top-0 md:top-1/2 md:-translate-y-1/2"
      : position === "start"
        ? "top-0"
        : "bottom-0";

  return (
    <div
      className={`timeline-dot absolute start-0 z-10 flex h-16 w-16 items-center justify-center rounded-full border border-[#162C6F]/15 bg-white text-sm font-semibold text-[#162C6F] shadow-sm md:start-1/2 md:h-20 md:w-20 md:text-base rtl:md:translate-x-1/2 ltr:md:-translate-x-1/2 ${pos}`}
    >
      {label}
    </div>
  );
}

export default function Timeline() {
  const { history } = useLocale().content;
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;

    if (!section || !line || !history.length) return;

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--brand-accent").trim() || "#C5AA76";
    const headerBg = css.getPropertyValue("--brand-header").trim() || "#001C3A";

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(line, { scaleY: 1 });
        return;
      }

      // خط پرشونده‌ی خود تایم‌لاین (فقط زیر lg دیده می‌شود؛ در lg مسیر سراسری کار را انجام می‌دهد)
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 65%",
            end: "bottom 70%",
            scrub: 0.6,
          },
        }
      );

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
            start: "top 82%",
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
      className="overflow-hidden bg-white py-24 text-[#162C6F] sm:py-28 lg:py-32"
    >
      <div className="page-container">
        <div className="relative mx-auto max-w-5xl">
          {/* خط عمودی تایم‌لاین */}
          <div className="absolute bottom-0 start-8 top-0 w-px bg-[#162C6F]/10 md:start-1/2">
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

            <div
              ref={lineRef}
              className="h-full w-full origin-top bg-accent shadow-[0_0_14px_var(--brand-accent)] lg:hidden"
              style={{ transform: "scaleY(0)" }}
            />
          </div>

          <ol className="space-y-28">
            {history.map((item, i) => {
              const textFirst = i % 2 === 0;
              const isRange = !!item.yearEnd;

              return (
                <li
                  key={`${item.year}-${i}`}
                  className={`relative grid grid-cols-1 items-center gap-8 ps-24 md:grid-cols-2 md:gap-24 md:ps-0 ${
                    isRange ? "py-28" : ""
                  }`}
                >
                  {isRange && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 start-8 z-0 w-0.5 bg-accent/40 md:start-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2"
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
                        ? "md:order-1 md:flex md:justify-end"
                        : "md:order-2 md:flex md:justify-start"
                    }
                  >
                    <div className="group w-full max-w-xl px-2 pb-6 pt-12 md:px-8">
                      <div className="timeline-content">
                        <span
                          aria-hidden="true"
                          className="block h-px w-8 bg-accent transition-all duration-500 group-hover:w-16"
                        />

                        <h3 className="mt-5 text-2xl font-bold tracking-tight text-[#162C6F] md:text-3xl">
                          {item.title}
                        </h3>

                        {item.paragraphs.map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="mt-4 leading-8 text-[#162C6F]/70 transition-colors duration-500 group-hover:text-[#162C6F]/90"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* تصویر رویداد */}
                  <div className={textFirst ? "md:order-2" : "md:order-1"}>
                    <div className="group/img overflow-hidden rounded-xl border border-[#162C6F]/10 bg-[#F7F8FA]">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          onLoad={() => ScrollTrigger.refresh()}
                          className="w-full object-cover opacity-95 saturate-75 transition duration-700 group-hover/img:scale-105 group-hover/img:opacity-100 group-hover/img:saturate-100"
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
