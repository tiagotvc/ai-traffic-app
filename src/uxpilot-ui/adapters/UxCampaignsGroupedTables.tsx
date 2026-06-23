"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import type {
  UxCampaignGroup,
  UxCampaignRow,
  UxTableTotals
} from "@/uxpilot-ui/adapters/campaigns-mappers";
import { cn } from "@/uxpilot-ui/lib/utils";

const objectiveColors: Record<string, string> = {
  Conversões: "#7c3aed",
  Awareness: "#f5a623",
  Retargeting: "#10b981",
  Leads: "#7c3aed",
  Tráfego: "#0ea5e9",
  Engajamento: "#f43f5e"
};

type Props = {
  groups: UxCampaignGroup[];
  selectedCampaignId: string | number | null;
  statusPendingId?: string | null;
  totalsOpen?: boolean;
  onSelectCampaign: (id: string | null) => void;
  onToggleStatus?: (id: string | number, rawStatus?: string) => void;
};

function TotalsFooterRow({ totals }: { totals: UxTableTotals }) {
  const t = useTranslations("campaignsPage");
  return (
    <tr
      className="border-t-2 font-semibold"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-thead)" }}
    >
      <td className="px-2 py-3" />
      <td className="px-4 py-3 text-sm font-heading" style={{ color: "var(--text-main)" }}>
        {t("rowTotal")}
      </td>
      <td className="px-4 py-3" />
      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
        {totals.budget}
      </td>
      <td className="px-4 py-3 text-sm font-heading whitespace-nowrap" style={{ color: "var(--amber)" }}>
        {totals.spend}
      </td>
      <td className="px-4 py-3 text-sm font-heading" style={{ color: "var(--text-main)" }}>
        {totals.roas}
      </td>
      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: "var(--text-main)" }}>
        {totals.cpl}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-main)" }}>
        {totals.ctr}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-dim)" }}>
        {totals.impressions}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-dim)" }}>
        {totals.clicks}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-dim)" }}>
        {totals.conversions}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-dim)" }}>
        {totals.frequency}
      </td>
      <td className="px-4 py-3 text-sm font-body" style={{ color: "var(--text-dim)" }}>
        {totals.cpm}
      </td>
    </tr>
  );
}

function CampaignRowCells({
  c,
  statusPendingId,
  onSelectCampaign,
  onToggleStatus
}: {
  c: UxCampaignRow;
  statusPendingId?: string | null;
  onSelectCampaign: (id: string) => void;
  onToggleStatus?: (id: string | number, rawStatus?: string) => void;
}) {
  const t = useTranslations("campaignsPage");
  const isActive = c.rawStatus === "ACTIVE" || c.status === "active";
  const statusAria =
    c.status === "draft"
      ? t("statusDraft")
      : isActive
        ? t("statusActive")
        : t("statusPaused");

  return (
    <>
      <td className="px-2 py-3 w-12 text-center" onClick={(e) => e.stopPropagation()}>
        {c.status === "draft" ? (
          <span className="text-[10px] font-body" style={{ color: "var(--text-dimmer)" }}>
            —
          </span>
        ) : (
          <CampaignStatusToggle
            active={isActive}
            disabled={statusPendingId === String(c.id)}
            ariaLabel={statusAria}
            onChange={() => onToggleStatus?.(c.id, c.rawStatus)}
          />
        )}
      </td>

      <td className="px-4 py-3 min-w-[200px]">
        <div>
          {c.status !== "draft" ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCampaign(String(c.id));
              }}
              className="text-left font-body font-medium text-sm hover:underline"
              style={{ color: "var(--text-main)" }}
            >
              {c.name}
            </button>
          ) : (
            <p className="font-body font-medium text-sm" style={{ color: "var(--text-main)" }}>
              {c.name}
            </p>
          )}
          <p className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-dimmer)" }}>
            {c.client}
          </p>
        </div>
      </td>

      <td className="px-4 py-3">
        <span
          className="text-[11px] font-body px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{
            background: `${objectiveColors[c.objective] || "#94a3b8"}18`,
            color: objectiveColors[c.objective] || "#94a3b8"
          }}
        >
          {c.objective}
        </span>
      </td>

      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
        {c.budget}
      </td>

      <td className="px-4 py-3 font-heading font-semibold text-sm whitespace-nowrap" style={{ color: "var(--amber)" }}>
        {c.spend}
      </td>

      <td className="px-4 py-3">
        {c.roas === "—" ? (
          <span style={{ color: "var(--text-dimmer)" }}>—</span>
        ) : (
          <div className="flex items-center gap-1">
            {c.trend === "up" ? (
              <TrendingUp size={12} style={{ color: "#10b981" }} />
            ) : (
              <TrendingDown size={12} style={{ color: "#ef4444" }} />
            )}
            <span
              className="font-heading font-semibold text-sm"
              style={{ color: c.trend === "up" ? "#10b981" : "#ef4444" }}
            >
              {c.roas}
            </span>
          </div>
        )}
      </td>

      <td className="px-4 py-3 font-body text-sm whitespace-nowrap" style={{ color: "var(--text-main)" }}>
        {c.cpl}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-main)" }}>
        {c.ctr}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
        {c.impressions}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
        {c.clicks}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
        {c.conversions}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
        {c.frequency}
      </td>

      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
        {c.cpm}
      </td>
    </>
  );
}

const TABLE_HEADERS = [
  "Status",
  "Campanha",
  "Objetivo",
  "Budget",
  "Investido",
  "ROAS",
  "CPL",
  "CTR",
  "Impressões",
  "Cliques",
  "Conversões",
  "Freq.",
  "CPM"
] as const;

export function UxCampaignsGroupedTables({
  groups,
  selectedCampaignId,
  statusPendingId,
  totalsOpen = true,
  onSelectCampaign,
  onToggleStatus
}: Props) {
  const totalCampaigns = useMemo(
    () => groups.reduce((sum, g) => sum + g.campaigns.length, 0),
    [groups]
  );

  if (!groups.length) {
    return (
      <div
        className="rounded-xl border py-16 text-center"
        style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
      >
        <p className="font-heading font-semibold opacity-40" style={{ color: "var(--text-main)" }}>
          Nenhuma campanha encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div
          key={group.key}
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3"
            style={{ borderColor: "var(--border-color)" }}
          >
            <h2 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {group.label}{" "}
              <span className="font-normal" style={{ color: "var(--text-dimmer)" }}>
                ({group.count})
              </span>
            </h2>
          </div>

          {totalsOpen && group.kpis.length > 0 ? (
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                {group.kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div
                      key={kpi.label}
                      className="min-w-0 rounded-lg border p-2"
                      style={{
                        background: "var(--surface-bg)",
                        borderColor: "var(--border-color)"
                      }}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ background: `${kpi.color}15` }}
                        >
                          <Icon size={12} style={{ color: kpi.color }} />
                        </div>
                        <span
                          className="shrink-0 rounded-full px-1 py-0.5 text-[9px] font-heading font-bold"
                          style={{
                            background: "rgba(245,166,35,0.1)",
                            color: "var(--amber)"
                          }}
                        >
                          {kpi.delta}
                        </span>
                      </div>
                      <p
                        className="truncate font-heading text-sm font-bold"
                        style={{ color: "var(--text-main)" }}
                      >
                        {kpi.value}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[10px] font-body"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {kpi.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ background: "var(--surface-thead)", borderColor: "var(--border-color)" }}>
                  {TABLE_HEADERS.map((label) => (
                    <th
                      key={label}
                      className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-heading whitespace-nowrap"
                      style={{ color: "var(--text-dimmer)" }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.campaigns.map((c, i) => (
                  <tr
                    key={c.id}
                    className={cn(
                      "border-b transition-colors even:bg-[var(--surface-row-alt)]",
                      c.status !== "draft" && "cursor-pointer"
                    )}
                    style={{
                      borderColor: "var(--border-color)",
                      background:
                        selectedCampaignId === c.id ? "rgba(245,166,35,0.06)" : undefined
                    }}
                    onClick={() => {
                      if (c.status === "draft") return;
                      onSelectCampaign(String(c.id));
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCampaignId !== c.id) {
                        e.currentTarget.style.background = "var(--row-hover)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        selectedCampaignId === c.id ? "rgba(245,166,35,0.06)" : "";
                    }}
                  >
                    <CampaignRowCells
                      c={c}
                      statusPendingId={statusPendingId}
                      onSelectCampaign={onSelectCampaign}
                      onToggleStatus={onToggleStatus}
                    />
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <TotalsFooterRow totals={group.totals} />
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      <p className="text-center text-xs font-body" style={{ color: "var(--text-dim)" }}>
        {totalCampaigns} campanha{totalCampaigns === 1 ? "" : "s"} em {groups.length} tipo
        {groups.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
