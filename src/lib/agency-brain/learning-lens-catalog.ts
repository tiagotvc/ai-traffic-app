import type { LearningCategory } from "@/lib/agency-brain/types";

export type LearningLensId = "ALL" | "PENDING" | "HIGH_IMPACT" | LearningCategory;

export type LearningLensEntry = {
  id: LearningLensId;
  iconPath: string;
  /** Soft active background */
  activeBg: string;
  activeText: string;
  iconBg: string;
  iconColor: string;
  /** Subtle pulse on icon (e.g. Alto impacto) */
  animated?: boolean;
  labelKey: string;
  hintKey: string;
};

export const LEARNING_LENS_CATALOG: LearningLensEntry[] = [
  {
    id: "ALL",
    iconPath: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
    activeBg: "bg-slate-100",
    activeText: "text-slate-800",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    labelKey: "learningLensAll",
    hintKey: "learningLensAllHint"
  },
  {
    id: "PENDING",
    iconPath: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    activeBg: "bg-amber-50",
    activeText: "text-amber-900",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    labelKey: "learningLensPending",
    hintKey: "learningLensPendingHint"
  },
  {
    id: "HIGH_IMPACT",
    iconPath: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    activeBg: "bg-rose-50",
    activeText: "text-rose-900",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    animated: true,
    labelKey: "learningLensHighImpact",
    hintKey: "learningLensHighImpactHint"
  },
  {
    id: "CREATIVE",
    iconPath: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.742-3.067M9.53 16.122l-3.182 3.182M15.75 7.5l-2.25-2.25M15.75 7.5l2.25 2.25M15.75 7.5H9.375",
    activeBg: "bg-violet-50",
    activeText: "text-violet-900",
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    labelKey: "category.CREATIVE",
    hintKey: "learningLensCreativeHint"
  },
  {
    id: "AUDIENCE",
    iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    activeBg: "bg-sky-50",
    activeText: "text-sky-900",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    labelKey: "category.AUDIENCE",
    hintKey: "learningLensAudienceHint"
  },
  {
    id: "OFFER",
    iconPath: "M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z",
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-900",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    labelKey: "category.OFFER",
    hintKey: "learningLensOfferHint"
  },
  {
    id: "COPY",
    iconPath: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a2.252 2.252 0 001.026-1.894v-6.836a48.454 48.454 0 00-1.088-.128c-1.087-.16-2.185-.283-3.293-.369V8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H7.5z",
    activeBg: "bg-indigo-50",
    activeText: "text-indigo-900",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    labelKey: "category.COPY",
    hintKey: "learningLensCopyHint"
  },
  {
    id: "BUDGET",
    iconPath: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    activeBg: "bg-teal-50",
    activeText: "text-teal-900",
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    labelKey: "category.BUDGET",
    hintKey: "learningLensBudgetHint"
  },
  {
    id: "LANDING_PAGE",
    iconPath: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.029-.946-8.284-2.503m0 0A17.919 17.919 0 013 12c0-1.605.42-3.113 1.157-4.418",
    activeBg: "bg-cyan-50",
    activeText: "text-cyan-900",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    labelKey: "category.LANDING_PAGE",
    hintKey: "learningLensLandingHint"
  },
  {
    id: "SEASONALITY",
    iconPath: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    activeBg: "bg-orange-50",
    activeText: "text-orange-900",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    labelKey: "category.SEASONALITY",
    hintKey: "learningLensSeasonalityHint"
  },
  {
    id: "GENERAL",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
    activeBg: "bg-slate-100",
    activeText: "text-slate-800",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    labelKey: "category.GENERAL",
    hintKey: "learningLensGeneralHint"
  }
];

export function deriveLearningLens(
  category: LearningCategory | "",
  _status: string,
  impact: string
): LearningLensId {
  if (impact === "HIGH") return "HIGH_IMPACT";
  if (category) return category;
  return "ALL";
}

export function countForLens(
  lensId: LearningLensId,
  summary: {
    total: number;
    highImpact: number;
    pendingSuggestions?: number;
    byCategory: Record<string, number>;
  } | null,
  pendingCount?: number
): number | null {
  if (!summary) return null;
  if (lensId === "ALL") return summary.total;
  if (lensId === "HIGH_IMPACT") return summary.highImpact;
  if (lensId === "PENDING") return pendingCount ?? summary.pendingSuggestions ?? null;
  return summary.byCategory[lensId] ?? 0;
}
