import { describe, expect, it } from "vitest";

import { buildCampaignTablePdf } from "@/lib/export/campaign-table-pdf";
import { buildCampaignTableXlsx } from "@/lib/export/campaign-table-xlsx";
import type { TableColumnRef } from "@/lib/campaign-table-layout";

const sampleRows = [
  {
    campaignName: "Test Campaign",
    clientName: "Acme",
    status: "ACTIVE",
    preset: "default",
    spend: 1000,
    conversions: 12,
    leads: 8,
    roas: 3.2,
    cpa: 83.33,
    cpl: 125,
    clicks: 420,
    ctr: 1.8
  }
];

const labels = {
  campaign: "Campaign",
  client: "Client",
  status: "Status",
  type: "Type",
  total: "Total",
  pageOf: (page: number, total: number) => `${page}/${total}`,
  statusActive: "Active",
  statusPaused: "Paused",
  statusInactive: "Inactive",
  statusDraft: "Draft",
  campaignsCount: (n: number) => `${n} campaigns`,
  clientScope: (client: string) => `Client: ${client}`,
  allClients: "All clients",
  periodLabel: "Jan 2026"
};

const metricColumns: TableColumnRef[] = [
  { kind: "metric", key: "spend" },
  { kind: "metric", key: "roas" }
];

describe("campaign export builders", () => {
  it("builds a non-empty PDF", async () => {
    const bytes = await buildCampaignTablePdf({
      groupLabel: "Campaign report",
      rows: sampleRows,
      metricColumns,
      customMetrics: {},
      labels,
      brandName: "Orion Agency"
    });
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)).toBe("%PDF");
  });

  it("builds a non-empty XLSX", async () => {
    const bytes = await buildCampaignTableXlsx({
      groupLabel: "Campaign report",
      rows: sampleRows,
      metricColumns,
      customMetrics: {},
      labels,
      brandName: "Orion Agency"
    });
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});
