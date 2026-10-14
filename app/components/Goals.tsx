import { goalAxes } from "@/data/history";

export default function Goals() {
  return (
    <section id="goals" className="page-container py-24">
      <h2 className="mb-12 text-3xl font-bold text-brand md:text-4xl">
        اهداف دفتر
      </h2>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 xl:gap-8">
        {goalAxes.map((axis, i) => (
          <article
            key={axis.title}
            className="border border-line border-t-4 border-t-gold bg-tint p-8"
          >
            <p className="mb-4 text-5xl font-extrabold text-gold">
              {(i + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}
            </p>

            <h3 className="mb-6 text-xl font-bold text-brand-2 md:text-2xl">
              {axis.title}
            </h3>

            <ul className="space-y-4">
              {axis.items.map((item) => (
                <li
                  key={item}
                  className="border-t border-line pt-4 leading-8 text-brand/80"
                >
                  {item}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}