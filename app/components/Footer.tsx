
"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import * as faFooter from "@/data/footerr/footer";
import * as enFooter from "@/data/footerr/footer.en";
import * as arFooter from "@/data/footerr/footer.ar";

type Locale = "fa" | "en" | "ar";

type FooterLink = {
  label: string;
  href: string;
};

const footerText = {
  fa: {
    contact: "تماس با ما",
    news: "آخرین مقالات",
    useful: "پیوندهای مفید",
    firm: "پیوندهای اصلی",
    legal: "پیوندهای حقوقی",
    home: "صفحه اصلی دفتر وکالت آل‌محمد",
    logo: "نشان دفتر وکالت آل‌محمد",
    textLogo: "لوگوی فارسی دفتر وکالت آل‌محمد",
    tagline: "نوشته تکمیلی لوگو",
    copyright: "تمامی حقوق محفوظ است.",
  },
  en: {
    contact: "Contact Us",
    news: "Latest Articles",
    useful: "Useful Links",
    firm: "Quick Links",
    legal: "Legal Information",
    home: "Alemohammad Law Office homepage",
    logo: "Alemohammad Law Office logo",
    textLogo: "Alemohammad Law Office wordmark",
    tagline: "Logo tagline",
    copyright: "All rights reserved.",
  },
  ar: {
    contact: "اتصل بنا",
    news: "أحدث المقالات",
    useful: "روابط مفيدة",
    firm: "روابط رئيسية",
    legal: "معلومات قانونية",
    home: "الصفحة الرئيسية لمكتب آل محمد للمحاماة",
    logo: "شعار مكتب آل محمد للمحاماة",
    textLogo: "اسم مكتب آل محمد للمحاماة",
    tagline: "النص التكميلي للشعار",
    copyright: "جميع الحقوق محفوظة.",
  },
};

function InlineLinks({ items }: { items: FooterLink[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm leading-7">
      {items.map((item) => {
        const external = /^https?:\/\//.test(item.href);

        return (
          <li key={item.label}>
            {external || item.href.startsWith("mailto:") ||
            item.href.startsWith("tel:") ? (
              <a
                href={item.href}
                className="transition-opacity hover:opacity-60"
                dir="auto"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="transition-opacity hover:opacity-60"
                dir="auto"
              >
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SocialLinks() {
  const socials = [
    {
      label: "Instagram",
      href: "https://www.instagram.com/alemohamadlaw.co?igsh=aHVtcmlpZ3JtZ2Rs",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3" y="3" width="18" height="18" rx="5"
            stroke="currentColor" strokeWidth="1.8"
          />
          <circle
            cx="12" cy="12" r="4"
            stroke="currentColor" strokeWidth="1.8"
          />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: "X",
      href: "https://x.com/",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 4l16 16M20 4L4 20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/company/alemohammad-law-firm/",
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <path
            d="M6.5 10v7M6.5 7v.1M10.5 17v-7h3v1.2c.5-.9 1.3-1.4 2.4-1.4 2 0 3.1 1.3 3.1 3.7V17h-3v-3.2c0-1.1-.4-1.7-1.4-1.7s-1.5.8-1.5 2V17h-2.6Z"
            fill="#162C6F"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-5">
      {socials.map((social) => (
        <a
          key={social.label}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          className="h-6 w-6 transition-opacity hover:opacity-60"
        >
          {social.icon}
        </a>
      ))}
    </div>
  );
}

export default function Footer() {
  const params = useParams<{ locale: string }>();
  const locale: Locale =
    params.locale === "en" || params.locale === "ar"
      ? params.locale
      : "fa";

  const data = {
    fa: faFooter,
    en: enFooter,
    ar: arFooter,
  }[locale];

  const t = footerText[locale];
  const isEnglish = locale === "en";

  return (
    <footer
      dir={isEnglish ? "ltr" : "rtl"}
      lang={locale}
      className="bg-[#162C6F] text-[#E8EAF1]"
    >
      <div className="mx-auto max-w-360 px-6 py-10 md:px-10 lg:px-14">
        <div className="flex flex-col gap-7 border-b border-white/20 pb-7 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href={`/${locale}`}
            aria-label={t.home}
            className="flex shrink-0 items-center gap-3"
          >
            <Image
              src="/images/brand/logo-fa.svg"
              alt={t.logo}
              width={37}
              height={30}
              className="h-[29.78px] w-[36.75px] shrink-0 object-contain"
            />

            <div className="flex flex-col items-start justify-center gap-1">
              <Image
                src="/images/brand/text-logo.svg"
                alt={t.textLogo}
                width={140}
                height={13}
                className="h-[13px] w-[140px] shrink-0 object-contain"
              />

              <Image
                src="/images/brand/text2024.svg"
                alt={t.tagline}
                width={110}
                height={12}
                className="h-[12px] w-[110px] shrink-0 object-contain"
              />
            </div>
          </Link>

          <nav aria-label={t.firm}>
            <InlineLinks items={data.firm} />
          </nav>
        </div>

        <div className="space-y-8 py-8">
          <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-8">
            <h2 className="shrink-0 text-base font-semibold lg:w-36">
              {t.contact}
            </h2>
            <div className="min-w-0 flex-1">
              <InlineLinks items={data.contact} />
            </div>
          </section>

          <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-8">
            <h2 className="shrink-0 text-base font-semibold lg:w-36">
              {t.news}
            </h2>
            <div className="min-w-0 flex-1">
              <InlineLinks items={data.news} />
            </div>
          </section>

          <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-8">
            <h2 className="shrink-0 text-base font-semibold lg:w-36">
              {t.useful}
            </h2>
            <div className="min-w-0 flex-1">
              <InlineLinks items={data.useful} />
            </div>
          </section>
        </div>

        <div className="flex justify-center border-t border-white/20 py-6">
          <SocialLinks />
        </div>

        <div className="border-t border-white/20 pt-6">
          <nav
            aria-label={t.legal}
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs leading-6 sm:text-sm"
          >
            {data.legal.map((item, index) => (
              <span
                key={item.label}
                className="flex items-center gap-3"
              >
                <Link
                  href={item.href}
                  className="transition-opacity hover:opacity-60"
                >
                  {item.label}
                </Link>

                {index !== data.legal.length - 1 && (
                  <span className="text-white/40" aria-hidden="true">
                    |
                  </span>
                )}
              </span>
            ))}
          </nav>

          <p className="mt-6 text-center text-xs leading-6 sm:text-sm">
            {isEnglish ? "Copyright" : "©"} © 2026 | {t.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
