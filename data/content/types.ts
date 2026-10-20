
import type { HistoryItem, Highlight } from "../history";
import type { Locale } from "@/i18n/config";

export type PracticeArea = {
  id: string;
  title: string;
  items: string[];
};

export type PracticeAreasIntro = {
  title: string;
  description: string;
  image: string;
};

export type Content = {
  ui: {
    siteName: string;
    logoAlt: string;
    nav: { label: string; href: string }[];
    contact: {
      email: string;
      phone: string;
      phoneHref: string;
    };
    searchPlaceholder: string;
    openMenu: string;
    closeMenu: string;
    sections: { highlights: string };
  };

  intro: {
    title: string;
  };

  history: HistoryItem[];
  highlights: Highlight[];

  practiceAreasIntro: PracticeAreasIntro;
  practiceAreas: PracticeArea[];
};
