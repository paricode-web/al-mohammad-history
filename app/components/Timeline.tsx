"use client";

import { useLayoutEffect, useRef } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import MobilePicture from "./MobilePicture";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// موبایل: تغییر ارتفاع ویوپورت هنگام بالا/پایین رفتن نوار آدرس باعث
// refresh کامل ScrollTrigger نشود. روی دسکتاپ اثری ندارد.
ScrollTrigger.config({ ignoreMobileResize: true });

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * دایره‌ی سال.
 * پر شدن آن دیگر با ScrollTrigger انجام نمی‌شود؛ کامپوننت مسیر (SiteVisualPath)
 * متغیر --line-fill (۰ تا ۱) را دقیقاً هم‌پای نوک خط روی همین عنصر می‌نویسد.
 * همه‌ی لایه‌ها فقط با opacity/transform تغییر می‌کنند (سبک برای کامپوزیتور)،
 * و عمداً هیچ transition ای روی آن‌ها نیست تا از خط عقب نمانند.
 */
function Dot({
  label,
  position = "mid",
  side = "start",
}: {
  label: string;
  position?: "mid" | "start" | "end";
  // فقط موبایل: سمتی که ریل مارپیچ در آن قرار دارد.
  // روی دسکتاپ بی‌اثر است.
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
      className={`timeline-dot absolute ${mobileSide} z-10 flex h-16 w-16 items-center justify-center rounded-full border border-light/20 bg-navy text-sm font-semibold text-light shadow-sm lg:start-1/2 lg:h-20 lg:w-20 lg:text-base rtl:lg:translate-x-1/2 ltr:lg:-translate-x-1/2 ${pos}`}
    >
      {/* هاله‌ی دسکتاپ (قبلاً box-shadow متحرک بود) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden rounded-full shadow-[0_0_0_8px_color-mix(in_srgb,var(--brand-accent)_15%,transparent),0_0_40px_color-mix(in_srgb,var(--brand-accent)_35%,transparent)] lg:block"
        style={{ opacity: "var(--line-fill, 0)" }}
      />

      {/* پرشدن دایره: رنگ + بوردر */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px rounded-full border border-accent bg-accent"
        style={{
          opacity: "var(--line-fill, 0)",
          transform: "scale(calc(0.88 + 0.12 * var(--line-fill, 0)))",
        }}
      />

      {/* متن اصلی؛ با پر شدن محو می‌شود */}
      <span
        className="relative"
        style={{ opacity: "calc(1 - var(--line-fill, 0))" }}
      >
        {label}
      </span>

      {/* متن روی رنگ accent؛ با پر شدن ظاهر می‌شود */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{
          color: "var(--brand-on-accent, #061F38)",
          opacity: "var(--line-fill, 0)",
        }}
      >
        {label}
      </span>
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

    /*
     * GSAP بر اساس breakpoint دو مجموعه انیمیشن جدا می‌سازد.
     * تغییر breakpoint به‌صورت خودکار انیمیشن قبلی را پاک می‌کند
     * و انیمیشن مناسب همان اندازه صفحه را فعال می‌کند.
     *
     * توجه: انیمیشن دایره‌ها از اینجا حذف شده و به کامپوننت مسیر منتقل شده،
     * تا پر شدن دایره دقیقاً با رسیدن نوک خط هماهنگ باشد.
     */
    const mm = gsap.matchMedia(section);

    /**
     * موبایل و تبلت:
     * انیمیشن‌های سبک‌تر برای کاهش هزینه Paint.
     */
    mm.add(
      {
        isMobile: "(max-width: 1023px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isMobile, reduceMotion: shouldReduceMotion } =
          context.conditions as {
            isMobile: boolean;
            reduceMotion: boolean;
          };

        if (!isMobile || shouldReduceMotion) return;

        // متن‌ها: حفظ حرکت و opacity، حذف blur فقط در موبایل
        gsap.utils
          .toArray<HTMLElement>(".timeline-content")
          .forEach((content) => {
            gsap.from(content.children, {
              y: 16,
              opacity: 0,
              duration: 0.65,
              stagger: 0.06,
              ease: "power2.out",
              force3D: true,
              scrollTrigger: {
                trigger: content,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            });
          });
      }
    );

    /**
     * دسکتاپ:
     * تنظیمات قبلی متن حفظ شده‌اند؛ از جمله Blur.
     */
    mm.add(
      {
        isDesktop: DESKTOP_QUERY,
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isDesktop, reduceMotion: shouldReduceMotion } =
          context.conditions as {
            isDesktop: boolean;
            reduceMotion: boolean;
          };

        if (!isDesktop || shouldReduceMotion) return;

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
      }
    );

    const refresh = () => ScrollTrigger.refresh();

    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      mm.revert();
    };
  }, [history.length]);

  return (
    <section
      id="history"
      ref={sectionRef}
      className="overflow-hidden bg-navy py-16 text-light sm:py-24 lg:py-32"
    >
      <div className="page-container">
        <div className="relative mx-auto max-w-5xl">
          {/* خط پایه تایم‌لاین */}
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

              // فقط موبایل: ریل در ردیف‌های زوج start و فرد end
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
                  {/* انکرهای مسیر مارپیچ موبایل */}
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
                      {/* خط بازه دسکتاپ؛ بدون تغییر */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 z-0 hidden w-0.5 bg-accent/40 lg:start-1/2 lg:block rtl:translate-x-1/2 ltr:-translate-x-1/2"
                      />

                      {/* خط بازه موبایل */}
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

                        <h3 className="mt-4 text-xl font-bold tracking-tight text-light sm:mt-5 sm:text-2xl lg:text-3xl">
                          {item.title}
                        </h3>

                        {item.paragraphs.map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="mt-3 text-[15px] leading-7 text-mist transition-colors duration-500 group-hover:text-light sm:mt-4 sm:text-base sm:leading-8"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* تصویر رویداد */}
                  <div
                    className={
                      textFirst ? "lg:order-2" : "lg:order-1"
                    }
                  >
                    <div className="group/img overflow-hidden rounded-xl border border-light/10 bg-light/5">
                      {item.image ? (
                        <MobilePicture
                          src={item.image}
                          sizes="75vw"
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          onLoad={() => {
                            // در موبایل aspect ratio ثابت است؛
                            // refresh برای هر تصویر لازم نیست.
                            if (
                              window.matchMedia(DESKTOP_QUERY).matches
                            ) {
                              ScrollTrigger.refresh();
                            }
                          }}
                          className="aspect-[4/3] w-full object-cover opacity-90 saturate-75 transition duration-700 group-hover/img:scale-105 group-hover/img:opacity-100 group-hover/img:saturate-100 lg:aspect-auto"
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
