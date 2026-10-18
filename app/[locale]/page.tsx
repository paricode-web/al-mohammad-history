
import Header from "../components/Header";
import Hero from "../components/Hero";
import Timeline from "../components/Timeline";
import Highlights from "../components/Highlights";
import SiteVisualPath from "../components/SiteVisualPath";
import Footer from "../components/Footer";

export default function Page() {
  return (
  <main>
  <Header />

  <SiteVisualPath>
    <Hero />
    <Timeline />
    <Highlights />
  </SiteVisualPath>

  <Footer />
</main>
  );
}
