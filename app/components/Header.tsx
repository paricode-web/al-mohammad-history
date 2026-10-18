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

/** آیتم دراپ‌داون‌ها: padding یکسان در همه‌جا */
const ITEM_CLASS = "block px-4 py-2.5 text-sm font-semibold transition-colors";

/** بین md و xl همبرگر مخفی است (breakpoint xl در globals.css برابر ۱۴۴۰px است) */
const NO_HAMBURGER_QUERY = "(min-width: 768px) and (max-width: 1439.98px)";

function Dropdown({
  label,
  trigger,
  children,
  className = "",
  panelClassName = "min-w-[150px]",
  dropUp = false,
}: {
  label: string;
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

    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors hover:bg-white/15"
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
        className={`absolute end-0 z-50 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl bg-white py-1 text-brand shadow-lg transition-all duration-200 ${panelClassName} ${
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
  label,
  className = "",
}: {
  items: { href: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <Dropdown
      label={label}
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
            className={`${ITEM_CLASS} hover:bg-grey`}
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
      label={LANG_LABELS[current] ?? current.toUpperCase()}
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
            <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
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
            className={`${ITEM_CLASS} ${
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

  // قفل اسکرول بدنه وقتی منو باز است
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // بستن منو با Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // اگر منو باز بود و عرض صفحه به محدوده‌ای رفت که همبرگر ندارد، منو بسته شود
  useEffect(() => {
    const mq = window.matchMedia(NO_HAMBURGER_QUERY);

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };

    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  // فقط وقتی از آستانه رد شد state عوض می‌شود
  useEffect(() => {
    let last = window.scrollY > 40;

    setScrolled(last);

    const onScroll = () => {
      const next = window.scrollY > 40;

      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-header shadow-md">
        <div
          className={`page-container flex items-center justify-between gap-6 transition-[height] duration-500 xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-12 ${
            scrolled ? "h-16 md:h-20" : "h-20 md:h-24"
          }`}
        >
          {/* لوگو: همیشه سفید، چون پس‌زمینه‌ی هدر همیشه تیره است */}
          <a
            href={`/${locale}`}
            className="relative block h-10 w-[120px] shrink-0 md:h-12 md:w-[150px]"
          >
            <Image
              src="/images/brand/logo-fa.svg"
              alt={ui.logoAlt}
              fill
              priority
              sizes="150px"
              className="object-contain brightness-0 invert rtl:object-right ltr:object-left"
            />
          </a>

          <nav
            aria-label={ui.openMenu}
            className={`hidden items-center justify-center gap-8 whitespace-nowrap text-white transition-opacity duration-300 xl:flex 2xl:gap-10 ${
              open ? "invisible opacity-0" : "opacity-100"
            }`}
          >
            {ui.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="py-2 text-base font-semibold transition-opacity hover:opacity-70"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 text-white xl:justify-self-end">
            <div
              className={`hidden items-center gap-2 transition-opacity duration-300 md:flex ${
                open ? "invisible opacity-0" : "opacity-100"
              }`}
            >
              <NavDropdown
                items={ui.nav}
                label={ui.openMenu}
                className="xl:hidden"
              />

              <LangDropdown current={locale} />
            </div>

            {/* همبرگر: موبایل و دسکتاپ بزرگ؛ بین md و xl دراپ‌داون منو جایش را می‌گیرد */}
            <button
              type="button"
              aria-label={open ? ui.closeMenu : ui.openMenu}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
              className="-me-2 flex h-11 w-11 items-center justify-center md:hidden xl:flex"
            >
              <span className="flex w-7 flex-col gap-[7px]">
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
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* منوی دو پنله */}
      <div
        id="site-menu"
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
          {/* پنل سفید */}
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
                  className={`group flex items-center justify-between break-words py-3 text-xl font-extrabold transition-all duration-500 sm:text-2xl md:text-4xl lg:text-5xl ${
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

            {/* خط عمودی روی درز دو پنل */}
            <span
              aria-hidden
              style={{ transitionDelay: open ? "650ms" : "0ms" }}
              className={`pointer-events-none absolute inset-y-0 end-0 w-0.5 origin-top bg-stone transition-transform duration-500 ${
                open ? "scale-y-100" : "scale-y-0"
              }`}
            />
          </div>

          {/* پنل تیره */}
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
                  aria-label={ui.searchPlaceholder}
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

                <LangDropdown current={locale} className="mt-2 w-fit" dropUp />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
