import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Check } from "lucide-react";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { Link } from "@/i18n/navigation";

const SCALE_TO = ["scaleTo1", "scaleTo2", "scaleTo3"] as const;
const PROOF_KEYS = ["today1", "today4", "today5"] as const;

/** Painel esquerdo do login — hero estático, impactante e conciso (sem slider). */
export async function LoginMarketingPanel() {
  const t = await getTranslations("auth");
  const tNav = await getTranslations("nav");

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-8 text-white xl:p-12">
      <div className="auth-premium-grid" />
      <div
        className="auth-premium-glow -right-24 -top-24 h-96 w-96"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 65%)" }}
      />
      <div className="auth-premium-glow -bottom-32 left-0 h-80 w-80 bg-violet-500/15" />

      <header className="relative z-10 shrink-0">
        <OrionAgencyLogo size="lg" variant="dark" className="orion-logo--sidebar" />
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center py-6">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-100 ring-1 ring-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
            {t("slide1Badge")}
          </span>

          <h1 className="mt-5 font-heading text-3xl font-bold leading-tight tracking-tight xl:text-[2.5rem] xl:leading-[1.1]">
            {t("slide1Title")}
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-violet-100/80 xl:text-[15px]">
            {t("slide1Subtitle")}
          </p>

          <ul className="mt-6 space-y-2.5">
            {PROOF_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span className="text-[13px] leading-snug text-violet-50/90">{t(key)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="font-heading text-xl font-bold text-violet-300">{t("statValue")}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-violet-200/75">{t("statLabel")}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="font-heading text-xl font-bold text-white">{t("stat2Value")}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-violet-200/75">{t("stat2Label")}</div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-violet-200/65">{t("scaleFrom1")}</span>
            <span className="text-violet-300/50" aria-hidden>
              →
            </span>
            {SCALE_TO.map((key) => (
              <span
                key={key}
                className="rounded-lg px-2.5 py-1 font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(99,102,241,0.3))",
                  border: "1px solid rgba(124,58,237,0.4)"
                }}
              >
                {t(key)}
              </span>
            ))}
          </div>

          <Link
            href="/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/20"
          >
            {tNav("viewPlans")}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <p className="relative z-10 shrink-0 text-[11px] leading-relaxed text-violet-200/55">
        {t("trustLine")}
      </p>
    </div>
  );
}
