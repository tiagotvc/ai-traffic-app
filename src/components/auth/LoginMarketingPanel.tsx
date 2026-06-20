import { getTranslations } from "next-intl/server";

import { TrafficAILogo } from "@/components/brand/TrafficAILogo";

const FEATURE_KEYS = ["selling1", "selling2", "selling3", "selling4"] as const;

function FeatureIcon({ index }: { index: number }) {
  const icons = [
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
    "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.06a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
  ];
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={icons[index % icons.length]} />
    </svg>
  );
}

export async function LoginMarketingPanel({ productLabel }: { productLabel: string }) {
  const t = await getTranslations("auth");

  return (
    <div className="relative flex h-full min-h-[420px] flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-950 p-8 text-white sm:p-10 lg:p-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[rgba(124,58,237,0.06)]0/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />

      <div className="relative z-10">
        <TrafficAILogo size="md" productLabel={productLabel} variant="dark" />
      </div>

      <div className="relative z-10 my-10 max-w-lg">
        <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-violet-100 ring-1 ring-white/15">
          {t("heroBadge")}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          {t("heroTitle")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-violet-100/90 sm:text-lg">
          {t("heroSubtitle")}
        </p>

        <ul className="mt-8 space-y-4">
          {FEATURE_KEYS.map((key, i) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-violet-200 ring-1 ring-white/10">
                <FeatureIcon index={i} />
              </span>
              <span className="pt-1.5 text-sm leading-snug text-violet-50/95 sm:text-[15px]">
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
