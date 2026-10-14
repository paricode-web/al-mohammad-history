import { history } from "@/data/history";

export default function Timeline() {
  return (
    <section id="history" className="page-container py-24">
      <div className="relative mx-auto max-w-5xl">
      
        <div className="absolute bottom-0 right-8 top-0 w-px bg-gold md:right-1/2" />

        <ol className="space-y-24">
          {history.map((item, i) => {
            const textFirst = i % 2 === 0;
            return (
              <li
                key={item.year}
                className="relative grid grid-cols-1 items-center gap-6 pr-24 md:grid-cols-2 md:gap-24 md:pr-0"
              >
              
                <div className="absolute right-0 top-0 z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-brand text-sm font-bold text-white md:right-1/2 md:top-1/2 md:h-20 md:w-20 md:-translate-y-1/2 md:translate-x-1/2 md:text-base">
                  {item.year}
                </div>

<div
  className={
    textFirst
      ? "md:order-1 md:flex md:justify-end"
      : "md:order-2 md:flex md:justify-start"
  }
>
  <div>
    <h3 className="text-xl font-bold text-brand-2 md:text-2xl">{item.title}</h3>
    {item.paragraphs.map((p, idx) => (
      <p key={idx} className="mt-4 leading-8 text-brand/80">
        {p}
      </p>
    ))}
  </div>
</div>

                {/* عکس */}
                <div className={textFirst ? "md:order-2" : "md:order-1"}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.title} className="w-full object-cover" />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-stone" />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}