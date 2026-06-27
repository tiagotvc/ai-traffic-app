import type { CampaignObjectiveKey } from "@/lib/campaign-draft";

/** Call-to-action values the app offers, in display order. */
export type MetaCtaValue = "LEARN_MORE" | "SIGN_UP" | "SHOP_NOW" | "CONTACT_US" | "WHATSAPP_MESSAGE";

export const META_CTA_VALUES: MetaCtaValue[] = [
  "LEARN_MORE",
  "SIGN_UP",
  "SHOP_NOW",
  "CONTACT_US",
  "WHATSAPP_MESSAGE"
];

/**
 * CTAs allowed by Meta per campaign objective (restricted to the set the app offers).
 * Keeps the creative compatible with the objective so publishing doesn't fail with
 * "the ad's creative is incompatible with the objective of the campaign".
 */
const ALLOWED_BY_OBJECTIVE: Record<CampaignObjectiveKey, MetaCtaValue[]> = {
  awareness: ["LEARN_MORE", "CONTACT_US", "WHATSAPP_MESSAGE"],
  traffic: ["LEARN_MORE", "SIGN_UP", "SHOP_NOW", "CONTACT_US", "WHATSAPP_MESSAGE"],
  engagement: ["LEARN_MORE", "SIGN_UP", "CONTACT_US", "WHATSAPP_MESSAGE"],
  leads: ["LEARN_MORE", "SIGN_UP", "CONTACT_US", "WHATSAPP_MESSAGE"],
  app: ["LEARN_MORE", "SIGN_UP"],
  sales: ["LEARN_MORE", "SIGN_UP", "SHOP_NOW", "CONTACT_US", "WHATSAPP_MESSAGE"]
};

export function allowedCtasForObjective(objective: CampaignObjectiveKey): MetaCtaValue[] {
  return ALLOWED_BY_OBJECTIVE[objective] ?? ["LEARN_MORE"];
}

/** Returns the CTA if it's valid for the objective, otherwise the objective's default. */
export function resolveCtaForObjective(objective: CampaignObjectiveKey, cta: string): string {
  const allowed = allowedCtasForObjective(objective);
  return (allowed as string[]).includes(cta) ? cta : allowed[0]!;
}
