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
    badge: "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]",
    dot: "bg-[rgba(124,58,237,0.06)]0"
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
    badge: "bg-slate-100 text-[var(--text-dim)]",
    dot: "bg-slate-400"
  }
};

export function getCategoryVisual(category: LearningCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.GENERAL;
}
