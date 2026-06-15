export type AdminPlanTier = "free" | "standard" | "popular" | "premium";

export function adminPlanTier(slug: string): AdminPlanTier {
  if (slug === "free") return "free";
  if (slug === "agency") return "premium";
  if (slug === "advanced") return "popular";
  return "standard";
}

export function adminPlanRowStyle(slug: string, isActive: boolean) {
  if (!isActive) {
    return {
      card: "border-slate-200 bg-white shadow-sm",
      header: "bg-slate-50 hover:bg-slate-100/90",
      body: "bg-white border-slate-100",
      accent: "bg-slate-300",
      title: "text-slate-700",
      meta: "text-slate-400",
      price: "text-slate-500",
      chevron: "text-slate-400",
      inactiveBadge: "bg-slate-200 text-slate-600"
    };
  }

  const tier = adminPlanTier(slug);
  const map = {
    free: {
      card: "border-slate-200 bg-white shadow-sm",
      header: "bg-gradient-to-r from-slate-100/90 to-white hover:from-slate-100",
      body: "bg-white border-slate-100",
      accent: "bg-slate-400",
      title: "text-slate-900",
      meta: "text-slate-500",
      price: "text-slate-600",
      chevron: "text-slate-400",
      inactiveBadge: "bg-slate-200 text-slate-600"
    },
    standard: {
      card: "border-violet-200 bg-white shadow-sm",
      header: "bg-gradient-to-r from-violet-100/80 to-white hover:from-violet-100",
      body: "bg-white border-violet-100",
      accent: "bg-violet-500",
      title: "text-slate-900",
      meta: "text-violet-600",
      price: "text-violet-700",
      chevron: "text-violet-400",
      inactiveBadge: "bg-violet-100 text-violet-700"
    },
    popular: {
      card: "border-violet-300 bg-white shadow-md ring-1 ring-violet-100",
      header: "bg-gradient-to-r from-violet-200/70 via-violet-50 to-white hover:from-violet-200/80",
      body: "bg-white border-violet-100",
      accent: "bg-violet-600",
      title: "text-slate-900",
      meta: "text-violet-700",
      price: "text-violet-800",
      chevron: "text-violet-500",
      inactiveBadge: "bg-violet-100 text-violet-800"
    },
    premium: {
      card: "border-amber-300/70 bg-white shadow-md ring-1 ring-amber-200/60",
      header:
        "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-800",
      body: "bg-white border-slate-200",
      accent: "bg-amber-400",
      title: "text-white",
      meta: "text-slate-300",
      price: "text-amber-200",
      chevron: "text-amber-200/90",
      inactiveBadge: "bg-white/15 text-amber-100 ring-1 ring-white/20"
    }
  } as const;

  return map[tier];
}
