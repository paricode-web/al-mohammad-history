import type { HistoryItem, Highlight, PracticeArea } from "../history";

export type Content = {
  ui: {
    siteName: string;
    logoAlt: string;
    nav: { label: string; href: string }[];
    contact: { email: string; phone: string; phoneHref: string };
    searchPlaceholder: string;
    openMenu: string;
    closeMenu: string;
    sections: {
      highlights: string;
      about: string;
      practiceAreas: string;
      goals: string;
    };
  };
  intro: { title: string };
  history: HistoryItem[];
  highlights: Highlight[];
  practiceAreas: PracticeArea[];
  practiceAreasNote: string;
  goals: string[];
};