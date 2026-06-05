export type CampaignListRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  accountLabel: string;
  alertCount: number;
  hasAlert: boolean;
  spend?: number;
  conversions?: number;
  impressions?: number;
  status?: string;
  dailyBudget?: number | null;
};

export function hydrateCampaignAlerts<T extends CampaignListRow>(
  rows: T[],
  alertsByCampaign: Map<string, number>
): T[] {
  return rows.map((r) => {
    const alertCount = alertsByCampaign.get(r.metaCampaignId) ?? 0;
    return { ...r, alertCount, hasAlert: alertCount > 0 };
  });
}

export function filterCampaignListRows<T extends CampaignListRow>(
  rows: T[],
  input: { q?: string; onlyAlerts?: boolean }
): T[] {
  let out = rows;
  if (input.onlyAlerts) {
    out = out.filter((r) => r.hasAlert);
  }
  const q = input.q?.trim().toLowerCase();
  if (q) {
    out = out.filter(
      (r) =>
        (r.campaignName ?? "").toLowerCase().includes(q) ||
        (r.clientName ?? "").toLowerCase().includes(q) ||
        (r.accountLabel ?? "").toLowerCase().includes(q) ||
        (r.metaCampaignId ?? "").toLowerCase().includes(q)
    );
  }
  return out;
}

/** Oculta campanhas sem atividade no período (exceto alertas ou ativas com orçamento). */
export function filterZeroActivityRows<T extends CampaignListRow>(
  rows: T[],
  input: { hideZeroActivity?: boolean }
): T[] {
  if (!input.hideZeroActivity) return rows;
  return rows.filter((r) => {
    const spend = r.spend ?? 0;
    const conversions = r.conversions ?? 0;
    const impressions = r.impressions ?? 0;
    if (spend > 0 || conversions > 0 || impressions > 0) return true;
    if (r.hasAlert) return true;
    if (r.status === "ACTIVE" && (r.dailyBudget ?? 0) > 0) return true;
    return false;
  });
}
