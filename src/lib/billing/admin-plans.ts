import "server-only";

import { repositories } from "@/db/repositories";
import { planToAdminJson } from "@/lib/billing/plan-serializer";

/** Uma query: SELECT * FROM plans ORDER BY sortOrder. */
export async function listAdminPlans() {
  const { plan: planRepo } = await repositories();
  const plans = await planRepo.find({ order: { sortOrder: "ASC" } });
  return plans.map(planToAdminJson);
}
