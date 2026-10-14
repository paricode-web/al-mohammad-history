import { achievements } from "@/data/history";

export default function Achievements() {
  return (
    <section id="achievements" className="  page-container py-24">
      <h2 className="mb-12 text-3xl font-bold text-brand md:text-4xl">پیشرفت‌ها و دستاوردها</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <article key={a.title} className="border border-line bg-tint p-6">
            <h3 className="mb-3 text-lg font-bold text-brand-2">{a.title}</h3>
            <p className="leading-8 text-brand/80">{a.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}