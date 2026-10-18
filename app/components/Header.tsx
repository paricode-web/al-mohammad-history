
"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";
import { locales, type Locale } from "@/i18n/config";

const EASE = "ease-[cubic-bezier(0.77,0,0.175,1)]";

const LANG_LABELS: Record<string, string> = {
  fa: "فارسی",
  en: "English",
  ar: "العربية",
};

function Dropdown({
  trigger,
  children,
  className = "",
  panelClassName = "min-w-[150px]",
  dropUp = false,
}: {
  trigger: ReactNode;
  children: (close: () => void) => ReactNode;
  className?: string;
  panelClassName?: string;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/15"
      >
        {trigger}

        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden
          className={`transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        className={`absolute end-0 z-50 overflow-hidden rounded-xl bg-white py-1 text-brand shadow-lg transition-all duration-200 ${panelClassName} ${
          dropUp ? "bottom-full mb-2" : "top-full mt-2"
        } ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        }`}
      >
        {children(() => setOpen(false))}
      </div>
    </div>
  );
}

function NavDropdown({
  items,
  locale,
  className = "",
}: {
  items: { href: string; label: string }[];
  locale: Locale;
  className?: string;
}) {
  return (
    <Dropdown
      className={className}
      panelClassName="min-w-[200px]"
      trigger={
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      }
    >
      {(close) =>
        items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={close}
            className="block px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-grey"
          >
            {item.label}
          </a>
        ))
      }
    </Dropdown>
  );
}

function LangDropdown({
  current,
  className = "",
  dropUp = false,
}: {
  current: Locale;
  className?: string;
  dropUp?: boolean;
}) {
  return (
    <Dropdown
      className={className}
      dropUp={dropUp}
      trigger={
        <>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 3 12 3Z" />
          </svg>

          <span>{current.toUpperCase()}</span>
        </>
      }
    >
      {(close) =>
        locales.map((l) => (
          <a
            key={l}
            href={`/${l}`}
            hrefLang={l}
            lang={l}
            aria-current={l === current ? "true" : undefined}
            onClick={close}
            className={`block px-4 py-2 text-sm font-semibold transition-colors ${
              l === current ? "bg-grey" : "hover:bg-grey"
            }`}
          >
            {LANG_LABELS[l] ?? l.toUpperCase()}
          </a>
        ))
      }
    </Dropdown>
  );
}

export default function Header() {
  const { locale, dir, content } = useLocale();
  const { ui } = content;

  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* هدر با رنگ جدید */}
      <header className="fixed inset-x-0 top-0 z-50 bg-header shadow-md">
        <div
          className={`page-container flex items-center justify-between transition-all duration-500 xl:grid xl:grid-cols-[1fr_auto_1fr] ${
            scrolled ? "h-20" : "h-24"
          }`}
        >
          <a
            href={`/${locale}`}
            className="relative block h-10 w-[120px] md:h-12 md:w-[150px]"
          >
            <Image
              src="/images/brand/logo-fa.svg"
              alt={ui.logoAlt}
              fill
              priority
              className={`object-contain transition-[filter] duration-500 rtl:object-right ltr:object-left ${
                open ? "" : "brightness-0 invert"
              }`}
            />
          </a>

          <nav
            className={`hidden items-center justify-center gap-10 text-white transition-opacity duration-300 xl:flex ${
              open ? "invisible opacity-0" : "opacity-100"
            }`}
          >
            {ui.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-base font-semibold transition-opacity hover:opacity-70"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-white xl:justify-self-end">
            <div
              className={`hidden items-center gap-1 transition-opacity duration-300 md:flex ${
                open ? "invisible opacity-0" : "opacity-100"
              }`}
            >
              <NavDropdown
                items={ui.nav}
                locale={locale}
                className="xl:hidden"
              />

              <LangDropdown current={locale} />
            </div>

            <button
              type="button"
              aria-label={open ? ui.closeMenu : ui.openMenu}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-8 w-9 flex-col items-center justify-center gap-[7px] md:hidden xl:flex"
            >
              <span
                className={`h-0.5 w-full bg-current transition-transform duration-500 ${
                  open ? "translate-y-[9px] rotate-45" : ""
                }`}
              />

              <span
                className={`h-0.5 w-full bg-current transition-opacity duration-300 ${
                  open ? "opacity-0" : ""
                }`}
              />

              <span
                className={`h-0.5 w-full bg-current transition-transform duration-500 ${
                  open ? "-translate-y-[9px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* منوی دو پنله */}
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
          {/* پنل سفید؛ رنگ آن تغییر نکرده */}
          <div
            className={`relative w-1/2 shrink-0 bg-white text-brand will-change-transform transition-transform duration-700 ${EASE} lg:w-auto lg:basis-[40%] lg:min-w-[380px] ${
              open
                ? "translate-x-0"
                : "rtl:translate-x-full ltr:-translate-x-full"
            }`}
          >
            <nav className="flex flex-col gap-1 px-4 pb-12 pt-28 md:px-10 lg:px-[60px] lg:pt-32">
              {ui.nav.map((item, i) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    transitionDelay: open ? `${350 + i * 70}ms` : "0ms",
                  }}
                  className={`group flex items-center justify-between py-3 text-xl font-extrabold transition-all duration-500 sm:text-2xl md:text-4xl lg:text-5xl ${
                    open
                      ? "translate-y-0 opacity-100"
                      : "translate-y-6 opacity-0"
                  }`}
                >
                  <span className="transition-transform duration-300 group-hover:scale-110 rtl:origin-right ltr:origin-left">
                    {item.label}
                  </span>

                  <span
                    aria-hidden
                    className="hidden text-2xl transition-transform duration-300 md:inline rtl:group-hover:-translate-x-2 ltr:group-hover:translate-x-2"
                  >
                    {dir === "rtl" ? "‹" : "›"}
                  </span>
                </a>
              ))}
            </nav>

            <span
              aria-hidden
              style={{ transitionDelay: open ? "650ms" : "0ms" }}
              className={`pointer-events-none absolute inset-y-0 end-0 w-0.5 origin-top bg-stone transition-transform duration-500 ${
                open ? "scale-y-100" : "scale-y-0"
              }`}
            />
          </div>

          {/* پنل آبی با رنگ جدید */}
          <div
            className={`-ms-px w-1/2 min-w-0 bg-header text-white will-change-transform transition-transform duration-700 ${EASE} lg:w-auto lg:flex-1 ${
              open
                ? "translate-x-0"
                : "rtl:-translate-x-full ltr:translate-x-full"
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
                  placeholder={ui.searchPlaceholder}
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-white/70 md:text-base"
                />

                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                  className="shrink-0"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </div>

              <div className="flex flex-col gap-4 text-sm md:text-xl">
                <a
                  href={`mailto:${ui.contact.email}`}
                  className="break-all transition-opacity hover:opacity-70"
                >
                  {ui.contact.email}
                </a>

                <a
                  href={ui.contact.phoneHref}
                  dir="ltr"
                  className="w-fit transition-opacity hover:opacity-70"
                >
                  {ui.contact.phone}
                </a>

                <LangDropdown
                  current={locale}
                  className="mt-2 w-fit"
                  dropUp
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
