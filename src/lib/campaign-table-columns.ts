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
  "status",
  "campaign",
  "client",
  "account",
  "spend",
  "conversions",
  "cpa",
  "roas",
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
const WIDTHS_KEY = "traffic-campaign-column-widths";

export function loadCampaignColumns(): CampaignColumnId[] {
  if (typeof window === "undefined") return DEFAULT_CAMPAIGN_COLUMNS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CAMPAIGN_COLUMNS;
    const parsed = JSON.parse(raw) as CampaignColumnId[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_CAMPAIGN_COLUMNS;
    // Respeita a ordem salva (incluindo a posição da coluna "status" após arrasta-e-solta).
    const cols = parsed.filter((c) => ALL_CAMPAIGN_COLUMNS.includes(c));
    return cols.length ? cols : DEFAULT_CAMPAIGN_COLUMNS;
  } catch {
    return DEFAULT_CAMPAIGN_COLUMNS;
  }
}

export function saveCampaignColumns(cols: CampaignColumnId[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

export type CampaignColumnWidths = Partial<Record<CampaignColumnId, number>>;

export function loadCampaignColumnWidths(): CampaignColumnWidths {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WIDTHS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CampaignColumnWidths;
    if (!parsed || typeof parsed !== "object") return {};
    const out: CampaignColumnWidths = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (ALL_CAMPAIGN_COLUMNS.includes(k as CampaignColumnId) && typeof v === "number" && v > 0) {
        out[k as CampaignColumnId] = v;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveCampaignColumnWidths(widths: CampaignColumnWidths) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths));
}
