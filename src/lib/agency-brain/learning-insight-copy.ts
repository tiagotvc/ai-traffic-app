import type { LearningCategory, LearningDto } from "@/lib/agency-brain/types";

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

export function whyItMatters(learning: LearningDto, t: TranslateFn): string {
  if (learning.evidence?.reason) {
    const rule = learning.evidence.ruleId ?? "";
    if (rule.includes("saturation") || rule.includes("frequency")) {
      return t("insightWhySaturation");
    }
    if (rule.includes("cpa") || rule.includes("spend_no_conversion")) {
      return t("insightWhyEfficiency");
    }
    if (rule.includes("ctr")) {
      return t("insightWhyCtr");
    }
    if (rule.includes("roas")) {
      return t("insightWhyRoas");
    }
  }

  switch (learning.category) {
    case "CREATIVE":
      return t("insightWhyCreative");
    case "AUDIENCE":
      return t("insightWhyAudience");
    case "OFFER":
      return t("insightWhyOffer");
    case "BUDGET":
      return t("insightWhyBudget");
    default:
      return t("insightWhyGeneral");
  }
}

export function suggestedAction(learning: LearningDto, t: TranslateFn): string {
  const rule = learning.evidence?.ruleId ?? "";
  if (rule.includes("saturation")) return t("insightActionRefreshCreative");
  if (rule.includes("spend_no_conversion")) return t("insightActionReviewFunnel");
  if (rule.includes("cpa_efficient") || rule.includes("signal_cpa_efficient"))
    return t("insightActionScale");
  if (rule.includes("ctr") || learning.category === "CREATIVE")
    return t("insightActionCreativeVariant");
  if (learning.category === "AUDIENCE") return t("insightActionAudience");
  if (learning.category === "OFFER") return t("insightActionOffer");
  if (learning.category === "BUDGET") return t("insightActionBudget");
  return t("insightActionReview");
}

export function formatEvidenceLines(
  learning: LearningDto,
  t: TranslateFn
): string[] {
  const lines: string[] = [];
  const snap = learning.metricSnapshot;
  const ev = learning.evidence;

  if (snap?.ctr != null) lines.push(t("metricCtr", { value: snap.ctr.toFixed(2) }));
  if (snap?.cpa != null) lines.push(t("metricCpa", { value: snap.cpa.toFixed(2) }));
  if (snap?.conversions != null) lines.push(t("insightEvidenceConversions", { count: snap.conversions }));
  if (snap?.spend != null) lines.push(t("metricSpend", { value: snap.spend.toFixed(0) }));
  if (ev?.deltaPercent != null) {
    lines.push(t("insightEvidenceDelta", { value: Math.abs(ev.deltaPercent).toFixed(0) }));
  }
  if (ev?.campaignName) lines.push(t("insightEvidenceCampaign", { name: ev.campaignName }));

  return lines;
}

export function learningBodyText(learning: LearningDto): string {
  return (
    learning.description?.trim() ||
    learning.evidence?.reason?.trim() ||
    learning.title
  );
}

export const PRIMARY_LEARNING_LENS_IDS = [
  "ALL",
  "HIGH_IMPACT",
  "CREATIVE",
  "AUDIENCE",
  "OFFER"
] as const;

export type PrimaryLearningLensId = (typeof PRIMARY_LEARNING_LENS_IDS)[number];

export const SECONDARY_LEARNING_LENS_IDS = [
  "COPY",
  "BUDGET",
  "LANDING_PAGE",
  "SEASONALITY",
  "GENERAL"
] as const;
