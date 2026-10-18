
"use client";

import { useLayoutEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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
      className={`timeline-dot absolute start-0 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-accent text-sm font-bold text-white md:start-1/2 md:h-20 md:w-20 md:text-base rtl:md:translate-x-1/2 ltr:md:-translate-x-1/2 ${pos}`}
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

    if (!section || !line) return;

    const ctx = gsap.context(() => {
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
            scrub: true,
          },
        }
      );

      gsap.utils
        .toArray<HTMLElement>(".timeline-content")
        .forEach((content) => {
          gsap.from(content, {
            y: 20,
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: content,
              start: "top 82%",
              toggleActions: "play none none reverse",
            },
          });
        });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section id="history" ref={sectionRef} className="page-container py-24">
      <div className="relative mx-auto max-w-5xl">
        {/* خط تایم‌لاین */}
        <div className="absolute bottom-0 start-8 top-0 w-px bg-pebble md:start-1/2">
          <div
            ref={lineRef}
            className="h-full w-full origin-top scale-y-0 bg-accent"
          />
        </div>

        <ol className="space-y-24">
          {history.map((item, i) => {
            const textFirst = i % 2 === 0;
            const isRange = !!item.yearEnd;

            return (
              <li
                key={item.year}
                className={`relative grid grid-cols-1 items-center gap-6 ps-24 md:grid-cols-2 md:gap-24 md:ps-0 ${
                  isRange ? "py-28" : ""
                }`}
              >
                {isRange && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 start-8 z-0 w-1 bg-accent md:start-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2"
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

                <div
                  className={
                    textFirst
                      ? "md:order-1 md:flex md:justify-end"
                      : "md:order-2 md:flex md:justify-start"
                  }
                >
                  <div className="timeline-content">
                    <h3 className="text-xl font-bold text-brand md:text-2xl">
                      {item.title}
                    </h3>

                    {item.paragraphs.map((p, idx) => (
                      <p key={idx} className="mt-4 leading-8 text-brand/80">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>

                <div className={textFirst ? "md:order-2" : "md:order-1"}>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-linen" />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
