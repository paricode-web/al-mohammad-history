"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { navItems, contact, lang, searchPlaceholder } from "@/data/nav";

const EASE = "ease-[cubic-bezier(0.77,0,0.175,1)]";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // قفل اسکرول صفحه وقتی منو بازه
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // بستن با Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // تشخیص اسکرول
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          open
            ? "bg-transparent"
            : scrolled
            ? "bg-brand shadow-md"
            : "bg-transparent"
        }`}
      >
        {/* پس‌زمینه دو رنگ هدر وقتی منو بازه: بعد از رسیدن پنل‌ها محو می‌شود */}
        <div
          aria-hidden
          style={{ transitionDelay: open ? "450ms" : "0ms" }}
          className={`pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_left,#ffffff_50%,#162c6f_50%)] transition-opacity duration-300 lg:bg-[linear-gradient(to_left,#ffffff_40%,#162c6f_40%)] ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          className={`page-container flex items-center justify-between transition-all duration-500 ${
            scrolled ? "h-20" : "h-24"
          }`}
        >
          <a href="/" className="relative block h-10 w-10 md:h-12 md:w-12">
            <Image
              src="/images/brand/logo-b.svg"
              alt="دفتر وکالت آل محمد"
              fill
              priority
              className={`object-contain object-right transition-[filter] duration-500 ${
                open ? "" : "brightness-0 invert"
              }`}
            />
          </a>

          <div className="flex items-center gap-6 xl:gap-8">
            <nav
              className={`hidden items-center gap-8 text-white transition-opacity duration-300 xl:flex ${
                open ? "invisible opacity-0" : "opacity-100"
              }`}
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-base font-semibold transition-opacity hover:opacity-70"
                >
                  {item.label}
                </a>
              ))}
            </nav>


            <button
              type="button"
              aria-label={open ? "بستن منو" : "باز کردن منو"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-8 w-9 flex-col items-center justify-center gap-[7px] text-white"
            >
              <span className={`h-0.5 w-full bg-current transition-transform duration-500 ${open ? "translate-y-[9px] rotate-45" : ""}`} />
              <span className={`h-0.5 w-full bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`h-0.5 w-full bg-current transition-transform duration-500 ${open ? "-translate-y-[9px] -rotate-45" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* منو: دو پنل کنار هم، از دو طرف می‌آیند و وسط صفحه به هم می‌رسند */}
      <div
        data-lenis-prevent
        aria-hidden={!open}
        style={{
          visibility: open ? "visible" : "hidden",
          transitionProperty: "visibility",
          transitionDelay: open ? "0ms" : "800ms",
        }}
        className="fixed inset-0 z-40 overflow-x-hidden overflow-y-auto"
      >
        <div className="flex min-h-full flex-row">
          {/* پنل سفید: از راست می‌آید و تا وسط می‌رسد */}
          <div
            className={`relative w-1/2 shrink-0 bg-white text-brand will-change-transform transition-transform duration-700 ${EASE} lg:w-auto lg:basis-[40%] lg:min-w-[380px] ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <nav className="flex flex-col gap-1 px-4 pb-12 pt-28 md:px-10 lg:px-[60px] lg:pt-32">
              {navItems.map((item, i) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{ transitionDelay: open ? `${350 + i * 70}ms` : "0ms" }}
                  className={`group flex items-center justify-between py-3 text-xl font-extrabold transition-all duration-500 sm:text-2xl md:text-4xl lg:text-5xl ${
                    open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
                >
                  <span className="origin-right transition-transform duration-300 group-hover:scale-110">
                    {item.label}
                  </span>
                  <span
                    aria-hidden
                    className="hidden text-2xl transition-transform duration-300 group-hover:-translate-x-2 md:inline"
                  >
                    ‹
                  </span>
                </a>
              ))}
            </nav>

            {/* خط اتصال عمودی: بعد از رسیدن دو پنل از بالا تا پایین درز باز می‌شود */}
            <span
              aria-hidden
              style={{ transitionDelay: open ? "650ms" : "0ms" }}
              className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-top bg-gold transition-transform duration-500 ${
                open ? "scale-y-100" : "scale-y-0"
              }`}
            />
          </div>

          {/* پنل آبی: از چپ می‌آید و تا وسط می‌رسد */}
          <div
            className={`-ms-px w-1/2 min-w-0 bg-brand text-white will-change-transform transition-transform duration-700 ${EASE} lg:w-auto lg:flex-1 ${
              open ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div
              style={{ transitionDelay: open ? "500ms" : "0ms" }}
              className={`flex flex-col gap-8 px-4 pb-12 pt-28 transition-opacity duration-500 md:gap-10 md:px-10 lg:px-[60px] lg:pt-32 ${
                open ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex items-center gap-3 rounded-full bg-white/15 px-4 py-3 md:gap-4 md:px-6 md:py-4">
                <input
                  type="search"
                  placeholder={searchPlaceholder}
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-white/70 md:text-base"
                />
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="shrink-0">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </div>

              <div className="flex flex-col gap-4 text-sm md:text-xl">
                <a href={`mailto:${contact.email}`} className="break-all transition-opacity hover:opacity-70">
                  {contact.email}
                </a>
                <a href={contact.phoneHref} className="transition-opacity hover:opacity-70">
                  {contact.phone}
                </a>
                <button
                  type="button"
                  className="mt-2 h-12 w-fit rounded-xl bg-white/15 px-6 text-sm transition-colors hover:bg-white/25"
                >
                  {lang}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}