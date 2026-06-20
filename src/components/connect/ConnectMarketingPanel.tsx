import { getTranslations } from "next-intl/server";

import { TrafficAILogo } from "@/components/brand/TrafficAILogo";

const FEATURE_KEYS = ["selling1", "selling2", "selling3", "selling4"] as const;

export async function ConnectMarketingPanel({ productLabel }: { productLabel: string }) {
  const t = await getTranslations("connectPlatform");

  return (
    <div className="relative flex h-full min-h-[420px] flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-8 text-white sm:p-10 lg:p-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px"
        }}
      />
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-[rgba(124,58,237,0.06)]0/15 blur-3xl" />

      <div className="relative z-10">
        <TrafficAILogo size="md" productLabel={productLabel} variant="dark" />
      </div>

      <div className="relative z-10 my-10 max-w-lg">
        <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-violet-100 ring-1 ring-white/15">
          {t("heroBadge")}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.12]">
          {t("metaHeroTitle")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-violet-100/90 sm:text-lg">
          {t("metaHeroSubtitle")}
        </p>

        <ul className="mt-8 space-y-3.5">
          {FEATURE_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm text-violet-200 ring-1 ring-white/10">
                ✓
              </span>
              <span className="pt-1 text-sm leading-snug text-violet-50/95 sm:text-[15px]">
                {t(key)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <div className="text-2xl font-bold text-white">{t("statValue")}</div>
              <div className="text-xs text-violet-200/80">{t("statLabel")}</div>
            </div>
            <div className="hidden h-10 w-px bg-white/15 sm:block" />
            <p className="max-w-xs text-xs leading-relaxed text-violet-200/70 sm:text-sm">
              {t("trustLine")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
