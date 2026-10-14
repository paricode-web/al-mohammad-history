
"use client";

import { useState } from "react";
import { practiceAreas, practiceAreasNote } from "@/data/history";

export default function PracticeAreas() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="practice-areas" className="bg-stone py-16 md:py-24">
      <div className="page-container">
        <h2 className="mb-8 text-center text-3xl font-bold text-brand md:mb-12 md:text-4xl">
          حوزه‌های فعالیت دفتر
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:gap-8">
          {practiceAreas.map((area, i) => {
            const isOpen = openIndex === i;
            const toggle = () => setOpenIndex(isOpen ? null : i);

            return (
              <div
                key={area.title}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle();
                  }
                }}
                className="group relative min-h-[280px] cursor-pointer overflow-hidden border border-line bg-background outline-none focus-visible:ring-2 focus-visible:ring-brand-2 md:min-h-[320px] lg:min-h-[350px]"
              >
                {/* عنوان در حالت عادی */}
                <div className="relative flex h-full min-h-[inherit] items-center justify-center p-6 text-center md:p-8">
                  <h3 className="text-xl font-bold leading-8 text-brand-2 md:text-2xl">
                    {area.title}
                  </h3>
                </div>

                {/* محتوای حوزه فعالیت */}
                <div
                  className={`absolute inset-0 z-10 flex overflow-y-auto bg-tint p-6 text-center text-brand transition-opacity duration-500 ease-in-out group-hover:opacity-100 md:p-8 ${
                    isOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="m-auto w-full">
                    <h3 className="mb-5 w-full border-b border-gold pb-4 text-xl font-bold leading-8 md:text-2xl">
                      {area.title}
                    </h3>

                    <ul className="list-none space-y-3 text-base leading-8">
                      {area.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center leading-8 text-brand/80 md:mt-12">
          {practiceAreasNote}
        </p>
      </div>
    </section>
  );
}
