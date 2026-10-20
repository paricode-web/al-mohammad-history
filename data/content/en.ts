import type { Content } from "./types";
import { history as faHistory } from "../history";

// عکس‌ها از فایل فارسی خونده می‌شن تا فقط یک جا مدیریت بشن
const img = (i: number) => faHistory[i]?.image;

export const en: Content = {
  ui: {
    siteName: "Alemohammad Law Office",
    logoAlt: "Alemohammad Law Office",
    nav: [
      { label: "Home", href: "https://www.alemohamadlaw.com/fa" },
      { label: "Office History", href: "https://www.alemohamadlaw.com/fa/office-history" },
      { label: "Our Lawyers", href: "https://www.alemohamadlaw.com/fa/lawyers" },
      { label: "Services", href: "https://www.alemohamadlaw.com/fa/services" },
      { label: "Blog", href: "https://www.alemohamadlaw.com/fa/blog" },
      { label: "Contact Us", href: "https://www.alemohamadlaw.com/fa/contact" },
    ],
    contact: {
      email: "info@alemohamadlaw.com",
      phone: "+98 21 4022 0759",
      phoneHref: "tel:+982140220759",
    },
    searchPlaceholder: "Search",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    sections: {
      highlights: "Key Achievements", // عنوان پیشنهادی: متن رسمی نیست
    },
  },

  intro: {
    title: "Introducing Alemohammad Law Office",
     },

  history: [
    {
      year: "1973",
      title: "Founding of Alemohammad Law Office",
      paragraphs: [
        "Alemohammad Law Office has more than 50 years of valuable experience in legal services. Since 1973 (1352 SH), it has formally provided specialized legal consultation and representation across a range of disputes. The firm serves Iranians living both inside and outside the country, as well as foreign nationals facing legal matters in Iran. With two new generations of the Alemohammad family entering the practice, a major shift took place in the firm's work:",
      ],
      image: img(0),
    },
    {
      year: "1979",
      title: "Representing Iran in international litigation",
      paragraphs: [
        "In 1979 (1358 SH), served as Iran's counsel on behalf of the Khuzestan Water & Power Authority before an international tribunal.",
      ],
      image: img(1),
    },
    {
      year: "2002",
      title: "Handling major economic cases",
      paragraphs: [
        "In 2002 (1381 SH), the firm represented the country's first and largest economic case, valued at $50 million.",
      ],
      image: img(2),
    },
    {
      year: "2006",
      title: "Seyed Amin Alemohammad joins the firm",
      paragraphs: [
        "In 1385 SH (2006), Seyed Amin Alemohammad was licensed to practice by the Tehran Bar Association and joined the firm's legal team.",
      ],
      image: img(3),
    },
    {
      year: "2011",
      title: "Seyed Amir Alemohammad joins the firm",
      paragraphs: [
        "In 1390 SH (2011), Seyed Amir Alemohammad also began his professional career at the firm as a licensed attorney of the Tehran Bar Association.",
      ],
      image: img(4),
    },
    {
      year: "2016",
     yearEnd: "2026",
      title: "Professional activity within the bar association",
  paragraphs: [
  "Membership in the Youth Commission of the Tehran Bar Association (1395–1397 SH) and the Legal Aid Commission of the Tehran Bar Association (1397–1405 SH).",
],

      image: img(1)
    },
  ],

  highlights: [
    {
      title: "30 Years",
      blocks: [
        {
          heading: "Long-term legal consulting",
          text: "Providing 30 years of legal consulting to the Khuzestan Water & Power Authority and legal consulting to Khuzestan Steel Company.",
        },
      ],
    },
    {
      title: "Leadership Roles",
      blocks: [
        {
          text: "Two terms as head of the Khuzestan and Lorestan Bar Association (1385-1388 SH / 2006-2009) and representing the Khuzestan Bar within ICBAR (1390-1394 SH / 2011-2015).",
        },
      ],
    },
    {
      title: "International Presence",
      blocks: [
        {
          text: "Seyed Amin Alemohammad was licensed by the Washington, D.C. Bar to provide consulting services to Iranians residing in the United States.",
        },
        {
          heading: 'Founding the "1844 Iranal" office in Washington, D.C.',
          text: "Providing specialized legal services to Iranians in the U.S. and handling Iran-related legal matters.",
        },
      ],
    },
  ],
  
practiceAreasIntro: {
  title: "Practice Areas",
  description:
    "Drawing on specialized, multi-decade experience, the firm has always been a trusted reference for resolving clients' legal matters, providing the best solutions in keeping with legal and ethical principles.",
  image: "/images/office-history/IMG_3047.webp",
},

practiceAreas: [
  {
    id: "property",
    title: "Real Estate Disputes",
    items: [
      "Ownership disputes",
      "Encroachment on property rights",
      "Lease and eviction disputes",
      "Resolving property-transfer disputes",
      "Drafting and pursuing purchase, sale, mortgage, and lease/title contracts",
    ],
  },
  {
    id: "criminal",
    title: "Criminal Cases",
    items: [
      "Fraud, theft, public intoxication, forgery, and use of forged documents",
      "Assault and related criminal matters",
      "Murder and defense in complex criminal cases",
    ],
  },
  {
    id: "family",
    title: "Family Law Matters",
    items: [
      "Divorce and related matters",
      "Mahriyeh (dower) claims",
      "Child custody",
      "Alimony and spousal rights",
      "Joint financial and asset disputes",
    ],
  },
  {
    id: "inheritance",
    title: "Inheritance and Wills",
    items: [
      "Obtaining inheritance certificates and inheritance tax matters",
      "Resolving disputes among heirs and drafting partition agreements",
      "Drafting wills",
    ],
  },
  {
    id: "contracts",
    title: "Drafting Contracts",
    items: [
      "Purchase and sale, construction partnerships, employment and commercial contracts",
      "Lease and mortgage contracts",
      "Power-of-attorney and representation contracts",
    ],
  },
],

};