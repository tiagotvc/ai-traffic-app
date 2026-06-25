import type { CampaignObjectiveKey } from "@/lib/campaign-draft";

const META_NAME_MAX = 120;

const OBJECTIVE_TAGS: Record<CampaignObjectiveKey, string> = {
  leads: "LEADS",
  sales: "VENDAS",
  traffic: "TRAF",
  awareness: "REC",
  engagement: "ENG",
  app_promotion: "APP"
};

/** Reduz texto para caber em nomes Meta, sem cortar no meio de palavra quando possível. */
export function abbreviateOrionLabel(text: string, maxLen: number): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/[|[\](){}]/g, " ")
    .trim();
  if (!cleaned) return "—";
  if (cleaned.length <= maxLen) return cleaned;

  const slice = cleaned.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.45) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
}

function formatOrionDateTag(date: Date, locale: string): string {
  const isEn = locale.startsWith("en");
  if (isEn) {
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const y = String(date.getFullYear()).slice(-2);
    return `${m}/${d}/${y}`;
  }
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

export function buildOrionAiCampaignNames(args: {
  productDescription: string;
  audienceLabel: string;
  zoneLabel: string;
  objective: CampaignObjectiveKey;
  locale?: string;
  date?: Date;
}): { campaignName: string; adsetName: string; draftName: string } {
  const locale = args.locale ?? "pt-BR";
  const dateTag = formatOrionDateTag(args.date ?? new Date(), locale);
  const objTag = OBJECTIVE_TAGS[args.objective] ?? "CAMP";
  const product = abbreviateOrionLabel(args.productDescription, 36);
  const audience = abbreviateOrionLabel(args.audienceLabel, 34);
  const zone = abbreviateOrionLabel(args.zoneLabel, 28);

  const campaignName = abbreviateOrionLabel(
    `[ORION] [${objTag}] ${product} · ${dateTag}`,
    META_NAME_MAX
  );
  const adsetName = abbreviateOrionLabel(`[PUB] ${audience} · [LOC] ${zone}`, META_NAME_MAX);
  const draftName = abbreviateOrionLabel(`[ORION] ${product} · ${dateTag}`, 80);

  return { campaignName, adsetName, draftName };
}

export function audienceLabelFromWizardInput(args: {
  businessDescription?: string;
  targetProfile?: string;
  audiencePreviewName?: string | null;
  targetingSuggestionName?: string | null;
  reusedPersonaName?: string | null;
}): string {
  if (args.reusedPersonaName?.trim()) return args.reusedPersonaName.trim();
  if (args.targetingSuggestionName?.trim()) return args.targetingSuggestionName.trim();
  if (args.audiencePreviewName?.trim()) return args.audiencePreviewName.trim();
  if (args.targetProfile?.trim()) return args.targetProfile.trim();
  if (args.businessDescription?.trim()) return args.businessDescription.trim();
  return "Público IA";
}

export function zoneLabelFromWizardInput(args: {
  regionsDescription?: string;
  zoneResolvedName?: string | null;
  zonePreviewName?: string | null;
  reusedZoneName?: string | null;
}): string {
  if (args.reusedZoneName?.trim()) return args.reusedZoneName.trim();
  if (args.zoneResolvedName?.trim()) return args.zoneResolvedName.trim();
  if (args.zonePreviewName?.trim()) return args.zonePreviewName.trim();
  if (args.regionsDescription?.trim()) return args.regionsDescription.trim();
  return "Brasil";
}
