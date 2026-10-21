"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESKTOP_QUERY = "(min-width: 1024px)";

function Dot({
  label,
  position = "mid",
  side = "start",
}: {
  label: string;
  position?: "mid" | "start" | "end";
  side?: "start" | "end";
}) {
  const pos =
    position === "mid"
      ? "top-0 lg:top-1/2 lg:-translate-y-1/2"
      : position === "start"
        ? "top-0"
        : "bottom-0";

  const mobileSide =
    side === "start" ? "start-0" : "end-0 lg:end-auto";

  return (
    <div
      data-timeline-dot
      data-line-passed="false"
      className={`timeline-dot absolute ${mobileSide} z-10 flex h-16 w-16 items-center justify-center rounded-full border border-light/20 bg-navy text-sm font-semibold text-light shadow-sm transition-[background-color,border-color,color,box-shadow] duration-700 ease-out data-[line-passed=true]:border-accent data-[line-passed=true]:bg-accent data-[line-passed=true]:text-navy data-[line-passed=true]:shadow-[0_0_0_6px_rgb(197_170_118_/_15%),0_0_32px_rgb(197_170_118_/_30%)] lg:start-1/2 lg:h-20 lg:w-20 lg:text-base rtl:lg:translate-x-1/2 ltr:lg:-translate-x-1/2 ${pos}`}
    >
      {label}
    </div>
  );
}

export default function Timeline() {
  const { history } = useLocale().content;
  const sectionRef = useRef<HTMLElement>(null);

  // موبایل: طلایی شدن تدریجی دایره‌ها هنگام اسکرول
  // با IntersectionObserver (بدون listener اسکرول و بدون getBoundingClientRect)
  // و بدون فعال کردن انیمیشن حرکت خط
  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const media = window.matchMedia("(max-width: 1023px)");
    let observer: IntersectionObserver | null = null;
    let lastWidth = window.innerWidth;

    const teardown = () => {
      observer?.disconnect();
      observer = null;
    };

    const setup = () => {
      teardown();

      if (!media.matches) return;

      // خط محرک روی ۶۶٪ ارتفاع صفحه است.
      // ۳۲px = نصف ارتفاع دایره‌ی موبایل (h-16)، تا لحظه‌ی طلایی شدن
      // دقیقاً وقتی باشد که مرکز دایره به خط می‌رسد.
      const bottomMargin = window.innerHeight * 0.34 + 32;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target as HTMLElement;
            const rootTop = entry.rootBounds?.top ?? 0;

            // یا داخل ناحیه‌ی بالای خط محرک است،
            // یا کاملاً از بالای صفحه رد شده است.
            const passed =
              entry.isIntersecting ||
              entry.boundingClientRect.top < rootTop;

            const next = String(passed);

            if (el.dataset.linePassed !== next) {
              el.dataset.linePassed = next;
            }
          }
        },
        {
          rootMargin: `0px 0px -${bottomMargin}px 0px`,
        }
      );

      section
        .querySelectorAll<HTMLElement>("[data-timeline-dot]")
        .forEach((dot) => observer!.observe(dot));
    };

    // فقط با تغییر عرض دوباره ساخته می‌شود تا باز و بسته شدن
    // نوار آدرس مرورگر موبایل باعث ساخت مجدد observer نشود.
    const handleResize = () => {
      if (window.innerWidth === lastWidth) return;

      lastWidth = window.innerWidth;
      setup();
    };

    setup();

    window.addEventListener("resize", handleResize);
    media.addEventListener("change", setup);

    return () => {
      teardown();
      window.removeEventListener("resize", handleResize);
      media.removeEventListener("change", setup);
    };
  }, [history.length]);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section || !history.length) return;

    const mm = gsap.matchMedia();

    mm.add(DESKTOP_QUERY, () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (reduceMotion) return;

      const ctx = gsap.context(() => {
        gsap.utils
          .toArray<HTMLElement>(".timeline-content")
          .forEach((content) => {
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
    });

    return () => mm.revert();
  }, [history.length]);

  return (
    <section
      id="history"
      ref={sectionRef}
      className="overflow-hidden bg-navy py-16 text-light sm:py-24 lg:py-32"
    >
      <div className="page-container">
        <div className="relative mx-auto max-w-5xl">
          <div className="absolute bottom-0 start-8 top-0 w-px bg-transparent lg:start-1/2 lg:bg-light/10">
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
              const railStart = i % 2 === 0;
              const side = railStart ? "start" : "end";

              return (
                <li
                  key={`${item.year}-${i}`}
                  className={`relative grid grid-cols-1 items-center gap-6 ${
                    railStart ? "ps-24 lg:ps-0" : "pe-24 lg:pe-0"
                  } lg:grid-cols-2 lg:gap-24 ${
                    isRange ? "py-20 lg:py-28" : ""
                  }`}
                >
                  <span
                    data-line-meander="top"
                    aria-hidden="true"
                    className={`absolute top-0 h-px w-px lg:hidden ${
                      railStart
                        ? "start-[calc(2rem-0.5px)]"
                        : "end-[calc(2rem-0.5px)]"
                    }`}
                  />

                  <span
                    data-line-meander="bottom"
                    aria-hidden="true"
                    className={`absolute bottom-0 h-px w-px lg:hidden ${
                      railStart
                        ? "start-[calc(2rem-0.5px)]"
                        : "end-[calc(2rem-0.5px)]"
                    }`}
                  />

                  {isRange && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 z-0 hidden w-0.5 bg-accent/40 lg:start-1/2 lg:block rtl:translate-x-1/2 ltr:-translate-x-1/2"
                      />

                      <span
                        aria-hidden="true"
                        className={`absolute inset-y-0 z-0 w-0.5 bg-accent/40 lg:hidden ${
                          railStart
                            ? "start-[calc(2rem-1px)]"
                            : "end-[calc(2rem-1px)]"
                        }`}
                      />
                    </>
                  )}

                  {isRange ? (
                    <>
                      <Dot
                        label={item.year}
                        position="start"
                        side={side}
                      />

                      <Dot
                        label={item.yearEnd!}
                        position="end"
                        side={side}
                      />
                    </>
                  ) : (
                    <Dot label={item.year} side={side} />
                  )}

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
                          className="block h-px w-8 bg-accent lg:transition-all lg:duration-500 group-hover:w-16"
                        />

                        <h3 className="mt-4 text-xl font-bold tracking-tight text-light sm:mt-5 sm:text-2xl lg:text-3xl">
                          {item.title}
                        </h3>

                        {item.paragraphs.map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="mt-3 text-[15px] leading-7 text-mist lg:transition-colors lg:duration-500 group-hover:text-light sm:mt-4 sm:text-base sm:leading-8"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={textFirst ? "lg:order-2" : "lg:order-1"}>
                    <div className="group/img overflow-hidden rounded-xl border border-light/10 bg-light/5">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          loading="lazy"
                          onLoad={() => {
                            if (
                              window.matchMedia(DESKTOP_QUERY).matches
                            ) {
                              ScrollTrigger.refresh();
                            }
                          }}
                          className="aspect-[4/3] w-full object-cover opacity-90 saturate-75 lg:transition lg:duration-700 group-hover/img:scale-105 group-hover/img:opacity-100 group-hover/img:saturate-100 lg:aspect-auto"
                        />
                      ) : (
                        <div className="aspect-[4/3] w-full bg-light/5" />
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
