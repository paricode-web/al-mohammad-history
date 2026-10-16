export const locales = ["fa", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fa";

export const dirOf = (l: Locale): "rtl" | "ltr" => (l === "en" ? "ltr" : "rtl");

export const isLocale = (v: string): v is Locale =>
  (locales as readonly string[]).includes(v);