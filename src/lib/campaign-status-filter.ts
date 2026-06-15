export type CampaignStatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "INACTIVE";

function normStatus(status?: string | null): string {
  return (status ?? "UNKNOWN").toUpperCase();
}

/** Filtra campanhas pelo status atual (Meta ou snapshot), alinhado ao filtro da UI. */
export function filterCampaignRowsByStatus<T extends { status?: string | null }>(
  rows: T[],
  statusFilter: CampaignStatusFilter | string
): T[] {
  if (!statusFilter || statusFilter === "ALL") return rows;
  if (statusFilter === "ACTIVE") {
    return rows.filter((r) => normStatus(r.status) === "ACTIVE");
  }
  if (statusFilter === "PAUSED") {
    return rows.filter((r) => normStatus(r.status) === "PAUSED");
  }
  if (statusFilter === "INACTIVE") {
    return rows.filter((r) => normStatus(r.status) !== "ACTIVE");
  }
  return rows;
}
