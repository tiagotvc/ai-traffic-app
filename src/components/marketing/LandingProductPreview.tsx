import { getTranslations } from "next-intl/server";

import { LoginProductShowcase } from "@/components/auth/LoginProductShowcase";
import { buildShowcaseCopy } from "@/lib/marketing/showcase-copy";

const FEATURES = ["sampleFeature1", "sampleFeature2", "sampleFeature3", "sampleFeature4"] as const;

export async function LandingProductPreview() {
  const t = await getTranslations("marketing");
  const showcaseCopy = buildShowcaseCopy(await getTranslations("auth"));

  return (
    <section id="samples" className="border-b border-white/5 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            {t("sampleBadge")}
          </p>
          <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">{t("sampleTitle")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-violet-200/70">
            {t("sampleSubtitle")}
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex justify-center lg:justify-end">
            <LoginProductShowcase copy={showcaseCopy} animate={false} />
          </div>

          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-white">{t("samplePreviewTitle")}</h3>
            <p className="text-sm leading-relaxed text-violet-200/70">{t("samplePreviewBody")}</p>
            <ul className="space-y-3">
              {FEATURES.map((key) => (
                <li key={key} className="flex items-start gap-3 text-sm text-violet-100/85">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
