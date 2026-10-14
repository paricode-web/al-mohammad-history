import { highlights } from "@/data/history";

export default function Highlights() {
  return (
    <section id="highlights" className="page-container py-24">
      <h2 className="mb-12 text-3xl font-bold text-brand md:text-4xl">
        دستاوردهای شاخص
      </h2>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3 xl:gap-8">
        {highlights.map((h) => (
          <article
            key={h.title}
            className="border border-line border-t-gold border-t-4 bg-tint p-8"
          >
            <h3 className="mb-6 text-3xl font-extrabold text-brand-2 md:text-4xl">
              {h.title}
            </h3>

            <div className="space-y-6">
              {h.blocks.map((b, i) => (
                <div key={i}>
                  {b.heading && (
                    <p className="mb-2 text-lg font-bold text-brand">
                      {b.heading}
                    </p>
                  )}
                  <p className="leading-8 text-brand/80">{b.text}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}