import { repositories } from "@/db/repositories";
import { slugify } from "@/lib/app-context";
import type { CampaignDraftPayload } from "@/lib/campaign-draft";
import { parseCampaignDraftPayload } from "@/lib/campaign-draft";

export type CampaignDraftListRow = {
  metaCampaignId: string;
  campaignName: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientTag: string;
  adAccountId: string;
  accountLabel: string;
  metaAdAccountId: string;
  spend: number;
  conversions: number;
  leads: number;
  cpl: null;
  cpa: null;
  roas: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  messages: number;
  frequency: number;
  alertCount: number;
  hasAlert: boolean;
  dailyBudget: null;
  status: "DRAFT";
  objective: string | null;
  isDraft: true;
  draftTemplateId: string;
  draftUpdatedAt: string;
  preset: "default";
};

function isUnpublishedDraft(payload: Record<string, unknown>): boolean {
  const meta = payload.meta as { campaignId?: string; publishMode?: string } | undefined;
  if (meta?.campaignId) return false;
  if (meta?.publishMode === "add_ad" || meta?.publishMode === "add_adset") return false;
  return true;
}

export async function loadCampaignDraftListRows(args: {
  tenantId: string;
  clientIds?: string[] | null;
  searchQ?: string;
  objectiveRaw?: string | null;
}): Promise<CampaignDraftListRow[]> {
  const { campaignTemplate: repo, client: clientRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId: args.tenantId } });
  const allowed = args.clientIds?.length ? new Set(args.clientIds) : null;
  const clientById = new Map(clients.map((c) => [c.id, c]));

  let templates = await repo.find({
    where: { tenantId: args.tenantId },
    order: { updatedAt: "DESC" },
    take: 200
  });

  if (allowed) {
    templates = templates.filter((t) => !t.clientId || allowed.has(t.clientId));
  }

  const qq = args.searchQ?.trim().toLowerCase() ?? "";
  const rows: CampaignDraftListRow[] = [];

  for (const template of templates) {
    const raw = template.payload ?? {};
    if (!isUnpublishedDraft(raw)) continue;

    let payload: CampaignDraftPayload;
    try {
      payload = parseCampaignDraftPayload(raw);
    } catch {
      continue;
    }

    const client =
      (template.clientId ? clientById.get(template.clientId) : null) ??
      (payload.clientSlug
        ? clients.find((c) => slugify(c.name) === payload.clientSlug || c.id === payload.clientSlug)
        : null);

    const campaignName = template.name || payload.campaign.name || "Rascunho";
    if (qq) {
      const hay = `${campaignName} ${client?.name ?? ""} draft:${template.id}`.toLowerCase();
      if (!hay.includes(qq)) continue;
    }

    const objective = payload.objective ?? null;
    if (args.objectiveRaw === "leads" && objective !== "leads") continue;
    if (args.objectiveRaw === "sales" && objective !== "sales") continue;
    if (args.objectiveRaw === "traffic" && objective !== "traffic") continue;

    rows.push({
      metaCampaignId: `draft:${template.id}`,
      campaignName,
      clientId: client?.id ?? template.clientId ?? "",
      clientName: client?.name ?? "—",
      clientSlug: payload.clientSlug || (client ? slugify(client.name) : ""),
      clientTag: "",
      adAccountId: "",
      accountLabel: payload.adAccountId || "—",
      metaAdAccountId: payload.adAccountId,
      spend: 0,
      conversions: 0,
      leads: 0,
      cpl: null,
      cpa: null,
      roas: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      reach: 0,
      messages: 0,
      frequency: 0,
      alertCount: 0,
      hasAlert: false,
      dailyBudget: null,
      status: "DRAFT",
      objective,
      isDraft: true,
      draftTemplateId: template.id,
      draftUpdatedAt: template.updatedAt.toISOString(),
      preset: "default"
    });
  }

  return rows;
}
