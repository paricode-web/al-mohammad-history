
"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useLocale } from "@/i18n/LocaleProvider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Timeline() {
  const { content, dir } = useLocale();
  const history = content.history;

  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section || !history.length) return;

    const ctx = gsap.context(() => {
      const triggers = gsap.utils.toArray<HTMLElement>(
        ".history-scroll-trigger"
      );

      triggers.forEach((trigger, index) => {
        ScrollTrigger.create({
          trigger,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => setActiveIndex(index),
          onEnterBack: () => setActiveIndex(index),
        });
      });
    }, section);

    ScrollTrigger.refresh();

    return () => ctx.revert();
  }, [history.length]);

  if (!history.length) return null;

  const activeItem = history[activeIndex] ?? history[0];
  const previousItem = history[activeIndex - 1] ?? null;
  const nextItem = history[activeIndex + 1] ?? null;

  const scrollToEvent = (index: number) => {
    const section = sectionRef.current;

    if (!section) return;

    const top =
      section.getBoundingClientRect().top +
      window.scrollY +
      index * window.innerHeight;

    window.scrollTo({
      top,
      behavior: "smooth",
    });
  };

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="history"
        ref={sectionRef}
        dir={dir}
        className="relative bg-page"
        style={{ height: `${history.length * 100}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="page-container h-full w-full">
            <div
              className="
                grid h-full grid-cols-1 items-center gap-5
                overflow-y-auto pt-24 pb-8

                lg:grid-cols-[minmax(380px,2fr)_minmax(0,1.6fr)_minmax(250px,1fr)]
                lg:gap-8 lg:overflow-visible lg:pt-24

                xl:grid-cols-[minmax(460px,2.2fr)_minmax(0,1.7fr)_minmax(280px,1fr)]
                xl:gap-12
              "
            >
              {/* Desktop vertical timeline */}
              <aside className="relative hidden h-[65vh] min-h-[420px] max-h-[680px] lg:block">
                {/* Timeline track */}
                <div className="absolute inset-y-0 start-1/2 w-[2px] -translate-x-1/2 bg-header/15">
                  <motion.div
                    className="absolute inset-x-0 top-0 bg-accent"
                    animate={{
                      height:
                        history.length <= 1
                          ? "100%"
                          : `${(activeIndex / (history.length - 1)) * 100}%`,
                    }}
                    transition={{
                      duration: 0.65,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>

                {history.map((item, index) => {
                  const position =
                    history.length <= 1
                      ? 50
                      : (index / (history.length - 1)) * 100;

                  const isActive = activeIndex === index;

                  return (
                    <button
                      key={`${item.year}-${index}`}
                      type="button"
                      onClick={() => scrollToEvent(index)}
                      aria-label={`رفتن به سال ${item.year}`}
                      aria-current={isActive ? "step" : undefined}
                      className="
                        group absolute start-1/2
                        flex -translate-x-1/2 -translate-y-1/2
                        items-center justify-center
                      "
                      style={{ top: `${position}%` }}
                    >
                      <motion.span
                        animate={{ scale: isActive ? 1 : 0.85 }}
                        transition={{ duration: 0.35 }}
                        className={`relative z-10 block rounded-full border ${
                          isActive
                            ? "h-6 w-6 border-accent bg-accent ring-8 ring-accent/20"
                            : "h-4 w-4 border-header/35 bg-page group-hover:border-accent group-hover:bg-accent"
                        }`}
                      />

                      <span
                        className={`absolute whitespace-nowrap text-sm ${
                          dir === "rtl" ? "end-8" : "start-8"
                        } ${
                          isActive
                            ? "font-bold text-header"
                            : "text-brand/55 group-hover:text-header"
                        }`}
                      >
                        {item.year}
                      </span>
                    </button>
                  );
                })}
              </aside>

              {/* Image gallery */}
              <div className="relative min-w-0">
                <div
                  className="
                    relative mx-auto
                    h-[22vh] min-h-[160px] max-h-[260px]
                    w-full max-w-[320px]
                    [perspective:1200px]

                    sm:h-[28vh] sm:min-h-[200px] sm:max-h-[320px]
                    sm:max-w-[400px]

                    lg:h-[min(68vh,620px)]
                    lg:min-h-0 lg:max-h-[620px]
                    lg:max-w-[760px]
                  "
                >
                  {/* Previous image */}
                  {previousItem && (
                    <motion.div
                      key={`previous-${activeIndex}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{
                        opacity: 0.4,
                        scale: 0.76,
                        rotateY: dir === "rtl" ? -28 : 28,
                      }}
                      transition={{ duration: 0.8 }}
                      className={`absolute top-1/2 z-0 h-[66%] w-[42%] -translate-y-1/2 overflow-hidden rounded-sm blur-[2px] ${
                        dir === "rtl" ? "left-0" : "right-0"
                      }`}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {previousItem.image ? (
                        <img
                          src={previousItem.image}
                          alt={previousItem.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-linen text-golden">
                          {previousItem.year}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-page/30" />
                    </motion.div>
                  )}

                  {/* Next image */}
                  {nextItem && (
                    <motion.div
                      key={`next-${activeIndex}`}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{
                        opacity: 0.4,
                        scale: 0.76,
                        rotateY: dir === "rtl" ? 28 : -28,
                      }}
                      transition={{ duration: 0.8 }}
                      className={`absolute top-1/2 z-0 h-[66%] w-[42%] -translate-y-1/2 overflow-hidden rounded-sm blur-[2px] ${
                        dir === "rtl" ? "right-0" : "left-0"
                      }`}
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      {nextItem.image ? (
                        <img
                          src={nextItem.image}
                          alt={nextItem.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-linen text-golden">
                          {nextItem.year}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-page/30" />
                    </motion.div>
                  )}

                  {/* Active image */}
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`active-${activeIndex}`}
                      initial={{
                        opacity: 0,
                        x: dir === "rtl" ? "25%" : "-25%",
                        rotateY: dir === "rtl" ? -32 : 32,
                        scale: 0.82,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        rotateY: 0,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        x: dir === "rtl" ? "-18%" : "18%",
                        rotateY: dir === "rtl" ? 25 : -25,
                        scale: 0.86,
                      }}
                      transition={{
                        duration: 0.9,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="
                        absolute left-1/2 top-1/2 z-10
                        h-[86%] w-[68%]
                        -translate-x-1/2 -translate-y-1/2
                        overflow-hidden shadow-2xl shadow-header/20
                      "
                      style={{
                        transformStyle: "preserve-3d",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      {activeItem.image ? (
                        <img
                          src={activeItem.image}
                          alt={activeItem.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-linen">
                          <span className="text-4xl font-light text-golden">
                            {activeItem.year}
                          </span>
                        </div>
                      )}

                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-header/40 via-transparent to-transparent" />

                      <div className="absolute bottom-0 start-0 h-1 w-1/3 bg-accent" />

                      <div className="absolute bottom-4 start-4 text-white">
                        <span className="text-sm tracking-widest">
                          {activeItem.year}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Soft background glow */}
                  <div
                    aria-hidden="true"
                    className="
                      pointer-events-none absolute left-1/2 top-1/2
                      h-[65%] w-[55%]
                      -translate-x-1/2 -translate-y-1/2
                      rounded-full bg-accent/10 blur-3xl
                    "
                  />
                </div>
              </div>

              {/* Event text */}
              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`text-${activeIndex}`}
                    initial={{
                      opacity: 0,
                      x: dir === "rtl" ? 20 : -20,
                    }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{
                      opacity: 0,
                      x: dir === "rtl" ? -12 : 12,
                    }}
                    transition={{ duration: 0.45 }}
                  >
                    <p className="mb-3 text-3xl font-light text-accent sm:text-4xl lg:text-5xl">
                      {activeItem.year}
                      {activeItem.yearEnd
                        ? ` — ${activeItem.yearEnd}`
                        : ""}
                    </p>

                    <h2 className="text-xl font-bold leading-relaxed text-header lg:text-2xl">
                      {activeItem.title}
                    </h2>

                    <div className="my-4 h-px w-14 bg-accent" />

                    <div className="max-h-[20vh] space-y-3 overflow-y-auto pe-2 sm:max-h-[25vh] lg:max-h-[45vh]">
                      {activeItem.paragraphs.map((paragraph, index) => (
                        <p
                          key={index}
                          className="text-sm leading-8 text-brand/80"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    <p className="mt-4 text-xs tracking-widest text-golden">
                      {String(activeIndex + 1).padStart(2, "0")}
                      <span className="mx-2 text-brand/30">/</span>
                      {String(history.length).padStart(2, "0")}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Mobile vertical timeline */}
              <div className="relative mx-auto w-full max-w-[320px] px-4 lg:hidden">
                <div className="absolute bottom-5 start-[29px] top-5 w-[2px] bg-header/15">
                  <motion.div
                    className="absolute inset-x-0 top-0 bg-accent"
                    animate={{
                      height:
                        history.length <= 1
                          ? "100%"
                          : `${(activeIndex / (history.length - 1)) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="relative flex flex-col gap-5">
                  {history.map((item, index) => {
                    const isActive = activeIndex === index;

                    return (
                      <button
                        key={`mobile-${item.year}-${index}`}
                        type="button"
                        onClick={() => scrollToEvent(index)}
                        aria-label={`رفتن به سال ${item.year}`}
                        aria-current={isActive ? "step" : undefined}
                        className="relative flex min-h-8 items-center gap-5 text-start"
                      >
                        <motion.span
                          animate={{ scale: isActive ? 1 : 0.85 }}
                          transition={{ duration: 0.3 }}
                          className={`relative z-10 block shrink-0 rounded-full border ${
                            isActive
                              ? "h-5 w-5 border-accent bg-accent ring-4 ring-accent/20"
                              : "h-4 w-4 border-header/35 bg-page"
                          }`}
                        />

                        <span
                          className={`text-sm ${
                            isActive
                              ? "font-bold text-header"
                              : "text-brand/60"
                          }`}
                        >
                          {item.year}
                        </span>

                        {isActive && (
                          <span className="text-xs text-brand/60">
                            {item.title}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll triggers */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          aria-hidden="true"
        >
          {history.map((item, index) => (
            <div
              key={`trigger-${item.year}-${index}`}
              className="history-scroll-trigger absolute inset-x-0"
              style={{
                top: `${index * 100}vh`,
                height: "100vh",
              }}
            />
          ))}
        </div>
      </section>
    </MotionConfig>
  );
}
