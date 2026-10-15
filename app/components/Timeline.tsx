
"use client";

import { useLayoutEffect, useRef } from "react";
import { history } from "@/data/history";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function Timeline() {
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
        .toArray<HTMLElement>(".timeline-dot")
        .forEach((dot) => {
          gsap.to(dot, {
            backgroundColor: "#B99352",
            borderColor: "#B99352",
            color: "#FFFFFF",
            duration: 0.35,
            scrollTrigger: {
              trigger: dot,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          });
        });

      // 3. ظاهر شدن متن‌ها
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
    <section
      id="history"
      ref={sectionRef}
      className="page-container py-24"
    >
      <div className="relative mx-auto max-w-5xl">

        {/* خط تایم‌لاین */}
        <div className="absolute bottom-0 right-8 top-0 w-px bg-gold md:right-1/2">
          <div
            ref={lineRef}
            className="h-full w-full origin-top scale-y-0 bg-gold"
          />
        </div>

        <ol className="space-y-24">
          {history.map((item, i) => {
            const textFirst = i % 2 === 0;

            return (
              <li
                key={item.year}
                className="relative grid grid-cols-1 items-center gap-6 pr-24 md:grid-cols-2 md:gap-24 md:pr-0"
              >

              
                <div className="timeline-dot absolute right-0 top-0 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-brand text-sm font-bold text-white md:right-1/2 md:top-1/2 md:h-20 md:w-20 md:-translate-y-1/2 md:translate-x-1/2 md:text-base">
                  {item.year}
                </div>

              
                <div
                  className={
                    textFirst
                      ? "md:order-1 md:flex md:justify-end"
                      : "md:order-2 md:flex md:justify-start"
                  }
                >
                  <div className="timeline-content">
                    <h3 className="text-xl font-bold text-brand-2 md:text-2xl">
                      {item.title}
                    </h3>

                    {item.paragraphs.map((p, idx) => (
                      <p
                        key={idx}
                        className="mt-4 leading-8 text-brand/80"
                      >
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
                    <div className="aspect-[4/3] w-full bg-stone" />
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
