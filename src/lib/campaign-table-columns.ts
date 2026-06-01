export type CampaignColumnId =
  | "campaign"
  | "client"
  | "account"
  | "spend"
  | "conversions"
  | "cpa"
  | "cpl"
  | "leads"
  | "roas"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "status"
  | "alerts"
  | "campaignId"
  | "budget";

export const DEFAULT_CAMPAIGN_COLUMNS: CampaignColumnId[] = [
  "campaign",
  "client",
  "account",
  "spend",
  "conversions",
  "cpa",
  "roas",
  "status",
  "alerts"
];

export const ALL_CAMPAIGN_COLUMNS: CampaignColumnId[] = [
  "campaign",
  "campaignId",
  "client",
  "account",
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "conversions",
  "leads",
  "cpl",
  "cpa",
  "roas",
  "budget",
  "status",
  "alerts"
];

export const COLUMN_I18N_KEYS: Record<CampaignColumnId, string> = {
  campaign: "colCampaign",
  campaignId: "colCampaignId",
  client: "colClient",
  account: "colAccount",
  spend: "colSpend",
  conversions: "colConversions",
  cpa: "colCpa",
  cpl: "colCpl",
  leads: "colLeads",
  roas: "colRoas",
  impressions: "colImpressions",
  clicks: "colClicks",
  ctr: "colCtr",
  cpc: "colCpc",
  cpm: "colCpm",
  status: "colStatus",
  alerts: "colAlerts",
  budget: "colBudget"
};

const STORAGE_KEY = "traffic-campaign-columns";

export function loadCampaignColumns(): CampaignColumnId[] {
  if (typeof window === "undefined") return DEFAULT_CAMPAIGN_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAMPAIGN_COLUMNS;
    const parsed = JSON.parse(raw) as CampaignColumnId[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_CAMPAIGN_COLUMNS;
    return parsed.filter((c) => ALL_CAMPAIGN_COLUMNS.includes(c));
  } catch {
    return DEFAULT_CAMPAIGN_COLUMNS;
  }
}

export function saveCampaignColumns(cols: CampaignColumnId[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}
