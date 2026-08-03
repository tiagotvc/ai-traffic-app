"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

function daysLeft(currentPeriodEnd: string | null): number | null {
  if (!currentPeriodEnd) return null;
  const end = new Date(currentPeriodEnd).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
}

/**
 * Aviso de contagem regressiva do trial de 7 dias — hoje o usuário não recebe nenhum sinal
 * antes de ser suspenso (bloqueio de login) no dia 7. Fica sempre visível (fora da área de
 * scroll do <main>), escalando de tom conforme os dias acabam.
 */
export function TrialBanner({
  status,
  currentPeriodEnd
}: {
  status: string;
  currentPeriodEnd: string | null;
}) {
  const t = useTranslations("billingPage");

  if (status !== "trialing") return null;
  const rawDays = daysLeft(currentPeriodEnd);
  if (rawDays == null) return null;
  const days = Math.max(0, rawDays);

  const urgent = days <= 1;
  const warn = days <= 3;

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm print:hidden ${
        urgent
          ? "bg-[rgba(239,68,68,0.12)] text-red-600"
          : warn
            ? "bg-[rgba(245,158,11,0.12)] text-amber-600"
            : "bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
      }`}
    >
      <span className="min-w-0">
        {t("trialBannerLabel")} · {days === 0 ? t("trialBannerToday") : t("trialDaysLeft", { days })}
      </span>
      <Link href="/settings?tab=plan" className="shrink-0 font-semibold underline underline-offset-2">
        {t("viewPlans")}
      </Link>
    </div>
  );
}
