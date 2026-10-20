
import { notFound } from "next/navigation";
import { getContent } from "@/data/content";
import type { Locale } from "@/i18n/config";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PracticeAreasPage({
  params,
}: PageProps) {
  const { locale } = await params;

  if (!["fa", "en", "ar"].includes(locale)) {
    notFound();
  }

  const content = getContent(locale as Locale);
  const intro = content.practiceAreasIntro;
  const areas = content.practiceAreas;

  return (
    <main
      dir={locale === "en" ? "ltr" : "rtl"}
      className="min-h-screen bg-white text-[#162C6F]"
    >
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="mb-5 block text-xs font-medium tracking-[0.2em] text-[#8B8FA3]">
              {locale === "fa"
                ? "خدمات حقوقی"
                : locale === "ar"
                  ? "الخدمات القانونية"
                  : "LEGAL SERVICES"}
            </span>

            <h1 className="max-w-xl text-3xl font-semibold leading-relaxed sm:text-4xl lg:text-5xl">
              {intro.title}
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-[#626779] sm:text-base sm:leading-9">
              {intro.description}
            </p>
          </div>

          <div className="relative">
            <div className="absolute -bottom-4 -start-4 h-full w-full border border-[#162C6F]/20" />

            <img
              src={intro.image}
              alt={intro.title}
              className="relative aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#F5F6F9]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="mb-10 flex flex-col gap-3 sm:mb-14">
            <span className="text-xs tracking-[0.18em] text-[#8B8FA3]">
              {locale === "fa"
                ? "حوزه‌های تخصصی"
                : locale === "ar"
                  ? "مجالات التخصص"
                  : "OUR EXPERTISE"}
            </span>

            <h2 className="text-2xl font-semibold sm:text-3xl">
              {locale === "fa"
                ? "حوزه‌های فعالیت ما"
                : locale === "ar"
                  ? "مجالات عملنا"
                  : "Our Practice Areas"}
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area, index) => (
              <article
                key={area.id}
                className="group flex min-h-64 flex-col border border-[#E0E3EC] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#162C6F] hover:shadow-xl hover:shadow-[#162C6F]/5 sm:p-8"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm text-[#8B8FA3]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="h-px w-10 bg-[#162C6F]/30 transition-all duration-300 group-hover:w-16 group-hover:bg-[#162C6F]" />
                </div>

                <h3 className="text-xl font-semibold">
                  {area.title}
                </h3>

                <ul className="mt-5 space-y-3">
                  {area.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm leading-7 text-[#626779]"
                    >
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#162C6F]/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <div className="h-px w-full bg-[#E8EAF1] transition-colors group-hover:bg-[#162C6F]/30" />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
