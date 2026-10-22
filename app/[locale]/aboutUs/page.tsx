import type { Metadata } from "next";
import AboutSections from "@/app/components/AboutSections";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
export const metadata: Metadata = {
  title: "درباره ما | دفتر وکالت آل محمد",
  description:
    "معرفی دفتر وکالت آل محمد، حوزه‌های فعالیت و اهداف دفتر.",
};

export default function AboutPage() {
  return (
    <main>
      <Header />
      <AboutSections />
      <Footer />
    </main>
  );
}
