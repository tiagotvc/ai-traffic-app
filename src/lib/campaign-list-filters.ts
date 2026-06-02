export type CampaignListRow = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  accountLabel: string;
  alertCount: number;
  hasAlert: boolean;
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
