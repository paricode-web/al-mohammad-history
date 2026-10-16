import type { HistoryItem, Highlight } from "../history";

export type Content = {
  ui: {
    siteName: string;
    logoAlt: string;
    nav: { label: string; href: string }[];
    contact: { email: string; phone: string; phoneHref: string };
    searchPlaceholder: string;
    openMenu: string;
    closeMenu: string;
    sections: { highlights: string };
  };
  intro: { title: string; };
  history: HistoryItem[];
  highlights: Highlight[];
};