import {
  BarChart3,
  Brain,
  FileText,
  LayoutDashboard,
  Sparkles,
  Zap
} from "lucide-react";
import { getTranslations } from "next-intl/server";

const CAPS = [
  { key: "cap1", icon: LayoutDashboard, accent: "from-violet-500/20 to-indigo-500/10 text-violet-300" },
  { key: "cap2", icon: BarChart3, accent: "from-amber-500/20 to-orange-500/10 text-amber-300" },
  { key: "cap3", icon: Brain, accent: "from-violet-500/20 to-purple-500/10 text-violet-300" },
  { key: "cap4", icon: FileText, accent: "from-emerald-500/20 to-teal-500/10 text-emerald-300" },
  { key: "cap5", icon: Zap, accent: "from-amber-500/20 to-yellow-500/10 text-amber-300" },
  { key: "cap6", icon: Sparkles, accent: "from-indigo-500/20 to-violet-500/10 text-indigo-300" }
] as const;

export async function LandingCapabilities() {
  const t = await getTranslations("marketing");

  return (
    <section id="capabilities" className="border-b border-white/5 bg-[#0a0f14] px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">{t("capBadge")}</p>
          <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">{t("capTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-violet-200/70">{t("capSubtitle")}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPS.map(({ key, icon: Icon, accent }) => (
            <article
              key={key}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent}`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-white">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-violet-200/65">{t(`${key}Body`)}</p>
              <p className="mt-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs leading-relaxed text-amber-200/80">
                {t(`${key}Example`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
