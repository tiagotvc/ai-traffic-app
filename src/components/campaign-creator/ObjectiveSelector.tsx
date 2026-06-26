"use client";

import { useTranslations } from "next-intl";

import { FormSelect } from "@/components/ui/FormSelect";
import type { BuyingType, CampaignObjectiveKey } from "@/lib/campaign-draft";
import { CAMPAIGN_OBJECTIVES, objectivesForBuyingType } from "@/lib/campaign-draft";

const OBJECTIVE_ICONS: Record<CampaignObjectiveKey, string> = {
  awareness:
    "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z",
  traffic:
    "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
  engagement:
    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  leads:
    "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
  app: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  sales: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
};

type Props = {
  buyingType: BuyingType;
  objective: CampaignObjectiveKey;
  onBuyingTypeChange: (bt: BuyingType) => void;
  onObjectiveChange: (obj: CampaignObjectiveKey) => void;
  showHeader?: boolean;
};

export function ObjectiveSelector({
  buyingType,
  objective,
  onBuyingTypeChange,
  onObjectiveChange,
  showHeader = true
}: Props) {
  const t = useTranslations("campaignCreator");
  const availableObjectives = objectivesForBuyingType(buyingType);

  function setBuyingType(bt: BuyingType) {
    const objs = objectivesForBuyingType(bt);
    const nextObjective = objs.includes(objective) ? objective : objs[0]!;
    onBuyingTypeChange(bt);
    if (nextObjective !== objective) onObjectiveChange(nextObjective);
  }

  return (
    <div>
      {showHeader ? (
        <div>
          <h2 className="font-heading text-lg font-bold text-[var(--text-main)]">
            {t("objectiveModalTitle")}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("objectiveModalHint")}</p>
        </div>
      ) : null}

      <div className={showHeader ? "mt-5" : ""}>
        <label className="ui-label">{t("buyingType")}</label>
        <div className="mt-1.5">
          <FormSelect
            value={buyingType}
            onChange={(v) => setBuyingType(v as BuyingType)}
            clearable={false}
            placeholder={t("buyingType")}
            options={[
              { value: "auction", label: t("buyingAuction") },
              { value: "reservation", label: t("buyingReservation") }
            ]}
          />
        </div>
        {buyingType === "reservation" ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-dim)]">
            {t("buyingReservationHint")}
          </p>
        ) : null}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
        {t("chooseObjective")}
      </p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {CAMPAIGN_OBJECTIVES.filter((obj) => availableObjectives.includes(obj)).map((obj) => {
          const selected = objective === obj;
          return (
            <button
              key={obj}
              type="button"
              onClick={() => onObjectiveChange(obj)}
              className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                selected
                  ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] shadow-[0_0_0_1px_var(--ui-accent-border)]"
                  : "border-[var(--border-color)] bg-[var(--surface-bg)] hover:border-[var(--ui-accent-border)] hover:bg-[var(--ui-accent-hover)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  selected
                    ? "bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)]"
                    : "bg-[var(--surface-card)] text-[var(--ui-accent)] group-hover:bg-[var(--ui-accent-muted)]"
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={OBJECTIVE_ICONS[obj]} />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
                  {t(`objective_${obj}`)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">
                  {t(`objective_${obj}_hint`)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
