"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

// مسیر عکس Hero (داخل public/images)
const HERO_IMAGE = "/images/about-hero.jpg";

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // نمایش فوری در موبایل برای کاهش انیمیشن‌های اسکرول
    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    if (reduceMotion || isMobile || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -4% 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function AboutSections() {
  const { ui, practiceAreas, practiceAreasNote, goals } =
    useLocale().content;

  // زوم آرام عکس هنگام لود (فقط دسکتاپ)
  const [heroReady, setHeroReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <main className="relative isolate overflow-hidden bg-[#001C3A] text-[#F2F4F6]">
      {/* HERO */}
          {/* HERO */}
      <section className="px-3 pb-4 pt-24 sm:px-4 sm:pb-6 sm:pt-28 lg:px-5">
        <div className="relative mx-auto h-[72svh] min-h-[440px] w-full max-w-[1600px] overflow-hidden rounded-2xl bg-[#0b2d4b] sm:h-[60svh] sm:min-h-[460px] sm:rounded-3xl md:h-[calc(100svh-8rem)] md:min-h-[560px]">
          {/* عکس: در موبایل و تبلت پایین عکس ثابت می‌ماند و بالای آن کراپ می‌شود */}
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className={`object-cover object-bottom transition-transform duration-[1600ms] ease-out motion-reduce:transition-none md:object-center md:will-change-transform ${
              heroReady ? "md:scale-100" : "md:scale-110"
            }`}
          />

          {/* گرادیان: در موبایل/تبلت کوتاه و ملایم تا پایین عکس دیده شود */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,28,58,0.7)_0%,rgba(0,28,58,0.2)_28%,transparent_50%)] md:bg-[linear-gradient(to_top,rgba(0,28,58,0.9)_0%,rgba(0,28,58,0.35)_50%,rgba(0,28,58,0.1)_100%)]"
          />

          {/* محتوا */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-5 pb-6 text-center sm:px-8 sm:pb-8 md:pb-12 lg:pb-16">
            <Reveal>
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full bg-[#C5AA76]"
                />
                <span className="text-[10px] font-medium tracking-[0.14em] text-[#F2F4F6] sm:text-xs">
                  AL MOHAMMAD LAW OFFICE
                </span>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <h1 className="mt-3 max-w-5xl text-balance text-3xl font-semibold leading-[1.3] tracking-tight text-[#F2F4F6] sm:mt-4 sm:text-4xl md:mt-6 md:text-6xl md:leading-[1.25] lg:text-7xl lg:leading-[1.2]">
                {ui.sections.about}
              </h1>
            </Reveal>

            {/* خط تزئینی فقط از md به بالا */}
            <Reveal delay={300} className="hidden md:block">
              <span
                aria-hidden="true"
                className="mt-10 block h-14 w-px bg-gradient-to-b from-[#C5AA76] to-transparent"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* PRACTICE AREAS */}
      <section
        aria-labelledby="practice-areas-title"
        className="bg-[#F2F4F6] py-20 text-[#001C3A] sm:py-24 md:py-28 lg:py-36"
      >
        <div className="page-container">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <h2
                id="practice-areas-title"
                className="text-2xl font-semibold leading-snug tracking-tight text-[#001C3A] sm:text-3xl md:text-4xl lg:text-6xl"
              >
                {ui.sections.practiceAreas}
              </h2>
            </Reveal>

            <ul className="mt-8 border-t border-[#001C3A]/20 sm:mt-12 md:mt-16 lg:mt-20">
              {practiceAreas.map((area) => (
                <li
                  key={area.title}
                  className="group border-b border-[#001C3A]/15"
                >
                  <Reveal>
                    <article className="grid gap-4 py-5 sm:gap-6 sm:py-7 md:grid-cols-12 md:items-start md:gap-8 md:py-9 lg:py-11">
                      <div className="min-w-0 md:col-span-5">
                        <h3 className="text-lg font-semibold leading-relaxed tracking-tight text-[#001C3A] transition-colors duration-300 sm:text-xl md:text-2xl lg:text-3xl [@media(hover:hover)]:group-hover:text-[#B59863]">
                          {area.title}
                        </h3>
                      </div>

                      <div className="min-w-0 md:col-span-7">
                        <ul className="grid grid-cols-1 gap-y-2 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3 lg:gap-x-8">
                          {area.items.map((item) => (
                            <li
                              key={item}
                              className="flex min-w-0 items-start gap-2.5 text-sm leading-7 text-[#001C3A]/75 sm:gap-3 sm:text-base sm:leading-8"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-[13px] h-px w-3 shrink-0 bg-[#C5AA76] transition-[width,background-color] duration-300 sm:w-4 [@media(hover:hover)]:group-hover:w-5 [@media(hover:hover)]:group-hover:bg-[#B59863]"
                              />
                              <span className="min-w-0 break-words">
                                {item}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ul>

            {practiceAreasNote && (
              <Reveal>
                <p className="mt-7 max-w-3xl border-s-2 border-[#C5AA76] py-1 ps-4 text-sm leading-7 text-[#001C3A]/75 sm:mt-10 sm:ps-6 sm:text-base sm:leading-8 md:mt-12 md:text-lg md:leading-9">
                  {practiceAreasNote}
                </p>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* GOALS */}
      <section
        aria-labelledby="goals-title"
        className="relative overflow-hidden bg-[#001C3A] py-14 text-[#F2F4F6] sm:py-20 md:py-24 lg:py-36"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 top-16 -z-10 h-56 w-56 rounded-full border border-[#C5AA76]/10 sm:-end-32 sm:top-20 sm:h-96 sm:w-96 md:h-[500px] md:w-[500px]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-12 top-28 -z-10 h-40 w-40 rounded-full border border-[#C5AA76]/10 sm:-end-20 sm:top-36 sm:h-64 sm:w-64 md:h-96 md:w-96"
        />

        <div className="page-container">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <h2
                id="goals-title"
                className="max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-[#F2F4F6] sm:text-3xl md:text-4xl lg:text-6xl"
              >
                {ui.sections.goals}
              </h2>
            </Reveal>

            <ol className="mt-8 grid grid-cols-1 gap-x-10 sm:mt-12 sm:grid-cols-2 sm:gap-x-8 md:mt-16 md:gap-x-12 lg:mt-20 lg:gap-x-20">
              {goals.map((goal) => (
                <li
                  key={goal}
                  className="group min-w-0 border-t border-[#C4CED8]/20"
                >
                  <Reveal>
                    <article className="flex min-w-0 gap-3 py-5 sm:gap-5 sm:py-7 md:gap-6 md:py-9 lg:py-10">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-7 text-[#C4CED8] transition-colors duration-300 sm:text-base sm:leading-8 md:text-lg md:leading-9 [@media(hover:hover)]:group-hover:text-[#F2F4F6]">
                          {goal}
                        </p>

                        <div className="mt-4 h-px w-0 bg-[#C5AA76] transition-[width] duration-500 sm:mt-5 [@media(hover:hover)]:group-hover:w-12" />
                      </div>

                      <span
                        aria-hidden="true"
                        className="shrink-0 pt-1 text-sm text-[#B59863]/0 transition-colors duration-300 [@media(hover:hover)]:group-hover:text-[#B59863]"
                      >
                        ↙
                      </span>
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>

            <Reveal>
              <div className="mt-10 border-t border-[#C4CED8]/20 pt-4 sm:mt-14 sm:pt-5 md:mt-20">
                <p className="text-[10px] tracking-[0.12em] text-[#C4CED8]/60 sm:text-xs">
                  AL MOHAMMAD LAW OFFICE
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}