import type { Locale } from "./config";

// عربی هم ارقام لاتین می‌گیرد (قابل تغییر بعد از نظر کارفرما)
export const numberLocale: Record<Locale, string> = {
  fa: "fa-IR",
  en: "en-US",
  ar: "en-US",
};

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";

export function toNumber(s: string) {
  return Number(
    s
      .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
  );
}