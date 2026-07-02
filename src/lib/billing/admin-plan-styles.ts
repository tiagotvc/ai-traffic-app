export type AdminPlanTier = "free" | "standard" | "popular" | "premium";

export function adminPlanTier(slug: string): AdminPlanTier {
  if (slug === "free") return "free";
  if (slug.startsWith("agency")) return "premium";
  if (slug.startsWith("advanced")) return "popular";
  return "standard";
}

/**
 * Plan rows use the canonical DS surfaces. Tier is communicated by badges/content,
 * never by replacing the page theme with bespoke gradients or dark cards.
 */
export function adminPlanRowStyle(_slug: string, isActive: boolean) {
  return {
    card:
      "border-[var(--border-color)] bg-[var(--surface-card)] shadow-sm",
    header:
      "bg-[var(--surface-card)] hover:bg-[var(--row-hover)]",
    body:
      "bg-[var(--surface-card)] border-[var(--border-color)]",
    accent: isActive ? "bg-[var(--ui-accent)]" : "bg-[var(--border-color)]",
    title: isActive ? "text-[var(--text-main)]" : "text-[var(--text-dim)]",
    meta: "text-[var(--text-dim)]",
    price: isActive ? "text-[var(--ui-accent)]" : "text-[var(--text-dim)]",
    chevron: "text-[var(--text-dimmer)]",
    inactiveBadge:
      "border border-[var(--border-color)] bg-[var(--surface-thead)] text-[var(--text-dim)]"
  };
}
