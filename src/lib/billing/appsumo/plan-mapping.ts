/**
 * AppSumo license tier → internal plan slug. Must match the tier order configured in the
 * AppSumo Partner Portal (Tier 1 = Individual/basic, Tier 2 = Advanced, Tier 3 = Agency).
 */
export const APPSUMO_TIER_PLAN_SLUG: Record<number, string> = {
  1: "basic",
  2: "advanced",
  3: "agency"
};

export function planSlugForAppsumoTier(tier: number | null | undefined): string {
  if (!tier) return "basic";
  return APPSUMO_TIER_PLAN_SLUG[tier] ?? "basic";
}
