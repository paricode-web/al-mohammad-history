import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Vazirmatn, DM_Sans } from "next/font/google";
import "../globals.css";
import { locales, isLocale, dirOf } from "@/i18n/config";
import { getContent } from "@/data/content";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import SmoothScroll from "../components/SmoothScroll";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazirmatn" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getContent(locale).ui.siteName,
    alternates: { languages: { fa: "/fa", en: "/en", ar: "/ar" } },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dir = dirOf(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${vazirmatn.variable} ${dmSans.variable}`}
    >
      <body>
        <LocaleProvider value={{ locale, dir, content: getContent(locale) }}>
          <SmoothScroll />
          
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}