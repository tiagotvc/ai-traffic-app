/** Filtros estruturados no estilo Meta Ads Manager. */

export type CampaignFilterField =
  | "name"
  | "id"
  | "objective"
  | "delivery"
  | "budget_campaign_daily"
  | "budget_campaign_lifetime"
  | "budget_adset_daily"
  | "budget_adset_lifetime"
  | "audience_age"
  | "audience_delivery_changes"
  | "audience_gender"
  | "audience_location";

export type BudgetOp = "gte" | "lte" | "eq";

export type AppliedCampaignFilter =
  | { field: "name" | "id"; value: string }
  | { field: "objective"; value: "leads" | "sales" | "traffic" | "awareness" | "other" }
  | { field: "delivery"; value: "ACTIVE" | "PAUSED" }
  | { field: "budget_campaign_daily"; op: BudgetOp; amount: number }
  | { field: "budget_campaign_lifetime"; op: BudgetOp; amount: number }
  | { field: "budget_adset_daily"; op: BudgetOp; amount: number }
  | { field: "budget_adset_lifetime"; op: BudgetOp; amount: number };

export type CampaignFilterRow = {
  metaCampaignId: string;
  campaignName: string;
  status?: string;
  objective?: string | null;
  dailyBudget?: number | null;
};

export function filterId(f: AppliedCampaignFilter): string {
  if (f.field === "name" || f.field === "id") return `${f.field}:${f.value}`;
  if (f.field === "objective" || f.field === "delivery") return `${f.field}:${f.value}`;
  if (
    f.field === "budget_campaign_daily" ||
    f.field === "budget_campaign_lifetime" ||
    f.field === "budget_adset_daily" ||
    f.field === "budget_adset_lifetime"
  ) {
    return `${f.field}:${f.op}:${f.amount}`;
  }
  return f.field;
}

function matchBudget(budget: number | null | undefined, op: BudgetOp, amount: number): boolean {
  const b = budget ?? 0;
  if (op === "gte") return b >= amount;
  if (op === "lte") return b <= amount;
  return Math.abs(b - amount) < 0.01;
}

function normalizeObjective(raw?: string | null): "leads" | "sales" | "traffic" | "awareness" | "other" {
  const o = (raw ?? "").toLowerCase();
  if (o.includes("lead") || o.includes("leadgen")) return "leads";
  if (o.includes("sale") || o.includes("purchase") || o.includes("conversion")) return "sales";
  if (o.includes("traffic") || o.includes("link_click")) return "traffic";
  if (o.includes("reach") || o.includes("awareness") || o.includes("brand")) return "awareness";
  return "other";
}

export function matchesCampaignFilters(row: CampaignFilterRow, filters: AppliedCampaignFilter[]): boolean {
  for (const f of filters) {
    switch (f.field) {
      case "name":
        if (!row.campaignName.toLowerCase().includes(f.value.toLowerCase())) return false;
        break;
      case "id":
        if (!row.metaCampaignId.toLowerCase().includes(f.value.toLowerCase())) return false;
        break;
      case "objective":
        if (normalizeObjective(row.objective) !== f.value) return false;
        break;
      case "delivery":
        if ((row.status ?? "") !== f.value) return false;
        break;
      case "budget_campaign_daily":
      case "budget_campaign_lifetime":
      case "budget_adset_daily":
      case "budget_adset_lifetime":
        if (!matchBudget(row.dailyBudget, f.op, f.amount)) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

export function audienceFilterSupported(field: CampaignFilterField): boolean {
  return field.startsWith("audience_");
}
