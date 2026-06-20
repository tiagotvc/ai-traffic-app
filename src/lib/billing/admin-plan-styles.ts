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
      card: "border-[var(--border-color)] bg-white shadow-sm",
      header: "bg-[var(--surface-thead)] hover:bg-[var(--row-hover)]/90",
      body: "bg-white border-[var(--border-color)]",
      accent: "bg-[var(--border-color)]",
      title: "text-[var(--text-dim)]",
      meta: "text-[var(--text-dimmer)]",
      price: "text-[var(--text-dim)]",
      chevron: "text-[var(--text-dimmer)]",
      inactiveBadge: "bg-slate-200 text-[var(--text-dim)]"
    };
  }

  const tier = adminPlanTier(slug);
  const map = {
    free: {
      card: "border-[var(--border-color)] bg-white shadow-sm",
      header: "bg-gradient-to-r from-slate-100/90 to-white hover:from-slate-100",
      body: "bg-white border-[var(--border-color)]",
      accent: "bg-[var(--text-dimmer)]",
      title: "text-[var(--text-main)]",
      meta: "text-[var(--text-dim)]",
      price: "text-[var(--text-dim)]",
      chevron: "text-[var(--text-dimmer)]",
      inactiveBadge: "bg-slate-200 text-[var(--text-dim)]"
    },
    standard: {
      card: "border-[rgba(124,58,237,0.2)] bg-white shadow-sm",
      header: "bg-gradient-to-r from-violet-100/80 to-white hover:from-violet-100",
      body: "bg-white border-[rgba(124,58,237,0.15)]",
      accent: "bg-[rgba(124,58,237,0.06)]0",
      title: "text-[var(--text-main)]",
      meta: "text-[var(--violet)]",
      price: "text-violet-700",
      chevron: "text-violet-400",
      inactiveBadge: "bg-[rgba(124,58,237,0.1)] text-violet-700"
    },
    popular: {
      card: "border-violet-300 bg-white shadow-md ring-1 ring-violet-100",
      header: "bg-gradient-to-r from-violet-200/70 via-violet-50 to-white hover:from-violet-200/80",
      body: "bg-white border-[rgba(124,58,237,0.15)]",
      accent: "bg-[var(--amber)]",
      title: "text-[var(--text-main)]",
      meta: "text-violet-700",
      price: "text-[var(--violet)]",
      chevron: "text-violet-500",
      inactiveBadge: "bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
    },
    premium: {
      card: "border-amber-300/70 bg-white shadow-md ring-1 ring-amber-200/60",
      header:
        "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 hover:from-slate-800 hover:via-slate-800",
      body: "bg-white border-[var(--border-color)]",
      accent: "bg-amber-400",
      title: "text-white",
      meta: "text-[var(--text-dimmer)]",
      price: "text-amber-200",
      chevron: "text-amber-200/90",
      inactiveBadge: "bg-white/15 text-amber-100 ring-1 ring-white/20"
    }
  } as const;

  return map[tier];
}
