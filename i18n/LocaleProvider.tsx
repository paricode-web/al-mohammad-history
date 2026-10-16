"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Content } from "@/data/content/types"; 

type Value = { locale: Locale; dir: "rtl" | "ltr"; content: Content };

const Ctx = createContext<Value | null>(null);

export function LocaleProvider({
  value,
  children,
}: {
  value: Value;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocale must be used inside LocaleProvider");
  return v;
}