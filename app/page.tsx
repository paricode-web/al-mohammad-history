import Header from "./components/Header";
import Hero from "./components/Hero";
import Timeline from "./components/Timeline";
import Highlights from "./components/Highlights";
import PracticeAreas from "./components/PracticeAreas";
import Goals from "./components/Goals";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <main>
      <Header />
      <Hero />
      <Timeline />
      <Highlights />
      <PracticeAreas />
      <Goals />
      <Footer />
    </main>
  );
}