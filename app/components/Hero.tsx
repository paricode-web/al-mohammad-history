import { intro } from "@/data/history";

export default function Hero() {
  return (
    <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-brand text-white md:min-h-[70vh]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/hero.jpg')" }}
      />
      <div className="absolute inset-0 bg-brand/70" />

      <div className="page-container relative pb-16 pt-32 md:pb-24 md:pt-40">
        <div className="mb-6 h-1 w-16 bg-gold" />
        <h1 className="mb-6 text-3xl font-bold leading-tight md:mb-8 md:text-5xl">
          {intro.title}
        </h1>
        <p className="max-w-xl text-base leading-8 text-white/90 md:max-w-2xl md:text-lg md:leading-9">
          {intro.text}
        </p>
      </div>
    </section>
  );
}