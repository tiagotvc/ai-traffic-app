import type { LearningCategory } from "@/lib/agency-brain/types";

export type CategoryVisual = {
  border: string;
  bg: string;
  badge: string;
  dot: string;
};

const CATEGORY_VISUALS: Record<LearningCategory, CategoryVisual> = {
  CREATIVE: {
    border: "border-l-violet-500",
    bg: "bg-gradient-to-r from-violet-50/80 to-white",
    badge: "bg-violet-100 text-violet-800",
    dot: "bg-violet-500"
  },
  AUDIENCE: {
    border: "border-l-blue-500",
    bg: "bg-gradient-to-r from-blue-50/80 to-white",
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500"
  },
  OFFER: {
    border: "border-l-emerald-500",
    bg: "bg-gradient-to-r from-emerald-50/80 to-white",
    badge: "bg-emerald-100 text-emerald-800",
    dot: "bg-emerald-500"
  },
  COPY: {
    border: "border-l-pink-500",
    bg: "bg-gradient-to-r from-pink-50/80 to-white",
    badge: "bg-pink-100 text-pink-800",
    dot: "bg-pink-500"
  },
  BUDGET: {
    border: "border-l-amber-500",
    bg: "bg-gradient-to-r from-amber-50/80 to-white",
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500"
  },
  LANDING_PAGE: {
    border: "border-l-cyan-500",
    bg: "bg-gradient-to-r from-cyan-50/80 to-white",
    badge: "bg-cyan-100 text-cyan-800",
    dot: "bg-cyan-500"
  },
  SEASONALITY: {
    border: "border-l-orange-500",
    bg: "bg-gradient-to-r from-orange-50/80 to-white",
    badge: "bg-orange-100 text-orange-800",
    dot: "bg-orange-500"
  },
  GENERAL: {
    border: "border-l-slate-400",
    bg: "bg-gradient-to-r from-slate-50/80 to-white",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400"
  }
};

export function getCategoryVisual(category: LearningCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.GENERAL;
}

/** Heroicons-style path data for summary stat cards */
export const SUMMARY_CARD_ICONS: Record<string, { d: string; iconBg: string; iconColor: string }> = {
  total: {
    d: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600"
  },
  high: {
    d: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600"
  },
  creative: {
    d: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.125zm0 0a15.998 15.998 0 003.742-3.741M9.53 16.122A15.998 15.998 0 0018 7.5M9.53 16.122L18 7.5m0 0a3.375 3.375 0 10-5.78-1.128 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 018.4 2.245c0 .399-.078.78-.22 1.125m0 0A15.998 15.998 0 0112 18.75",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600"
  },
  audience: {
    d: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600"
  },
  pending: {
    d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600"
  }
};
