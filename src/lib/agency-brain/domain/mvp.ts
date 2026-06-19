import type { AgencyBrainModule, AgencyBrainModuleMeta } from "@/lib/agency-brain/domain/modules";
import { isLabsEnabledForUser } from "@/lib/labs/feature-flag";

/** Core Agency Brain tabs shipped in the first public MVP. */
export const AGENCY_BRAIN_MVP_MODULES = [
  "learnings",
  "hypotheses",
  "dna",
  "suggestions"
] as const satisfies readonly AgencyBrainModule[];

export function isAgencyBrainMvpModule(id: AgencyBrainModule): id is AgencyBrainMvpModuleId {
  return (AGENCY_BRAIN_MVP_MODULES as readonly AgencyBrainModule[]).includes(id);
}

export function isAgencyBrainModuleComingSoon(
  mod: AgencyBrainModuleMeta,
  isPlatformAdmin?: boolean
): boolean {
  if (mod.id === "labs") return !isLabsEnabledForUser(isPlatformAdmin);
  return mod.comingSoon === true;
}

export type AgencyBrainMvpModuleId = (typeof AGENCY_BRAIN_MVP_MODULES)[number];
