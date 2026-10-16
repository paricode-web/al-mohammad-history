import type { Locale } from "@/i18n/config";
import type { Content } from "./types";
import { fa } from "./fa";
import { en } from "./en";
import { ar } from "./ar";

const all: Record<Locale, Content> = { fa, en, ar };

export const getContent = (l: Locale): Content => all[l];