import type { Content } from "./types";
import { intro, history, highlights , practiceAreas,
  practiceAreasNote,
  goals,} from "../history";
import { navItems, contact, searchPlaceholder } from "../nav";

export const fa: Content = {
  ui: {
    siteName: "دفتر وکالت آل محمد",
    logoAlt: "دفتر وکالت آل محمد",
    nav: navItems,
    contact,
    searchPlaceholder,
    openMenu: "باز کردن منو",
    closeMenu: "بستن منو",
    sections: {
    highlights: "دستاوردهای شاخص",
    about: "درباره ما",
    practiceAreas: "حوزه‌های فعالیت",
    goals: "اهداف دفتر",
    },
  },
  intro,
  history,
  highlights,
  practiceAreas,
  practiceAreasNote,
  goals,
};