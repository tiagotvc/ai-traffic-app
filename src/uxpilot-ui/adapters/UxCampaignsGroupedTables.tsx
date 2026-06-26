"use client";

import { useMemo } from "react";
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { campaignPresetBadgeClass } from "@/lib/campaign-preset-badge";
import {
  campaignMetricTone,
  campaignMetricToneClass,
  campaignPresetCode,
  CAMPAIGN_ROW_SELECTED_BG
} from "@/lib/campaign-table-premium";
import { getCampaignPresetIconConfig } from "@/lib/campaign-preset-icons";
import type {
  UxCampaignGroup,
  UxCampaignRow,
  UxTableTotals
} from "@/uxpilot-ui/adapters/campaigns-mappers";
import { cn } from "@/uxpilot-ui/lib/utils";

type Props = {
  groups: UxCampaignGroup[];
  selectedCampaignId: string | number | null;
  statusPendingId?: string | null;
  totalsOpen?: boolean;
  onSelectCampaign: (id: string | null) => void;
  onToggleStatus?: (id: string | number, rawStatus?: string) => void;
};

function CampaignGroupHeader({ groupKey, label, count }: { groupKey: string; label: string; count: number }) {
  const { Icon } = getCampaignPresetIconConfig(groupKey);
  return (
    <div className="ui-campaign-table-shell__header">
      <div className="ui-campaign-table-shell__title">
        <span className="ui-campaign-table-shell__icon">
          <Icon size={18} strokeWidth={2} />
        </span>
        <span className="truncate">
          {label} <span className="font-normal text-[var(--text-dimmer)]">({count})</span>
        </span>
      </div>
    </div>
  );
}

function TotalsFooterRow({ totals }: { totals: UxTableTotals }) {
  const t = useTranslations("campaignsPage");
  const ctrTone = campaignMetricToneClass(campaignMetricTone(totals.ctr));

  return (
    <tr>
      <td />
      <td>{t("rowTotal")}</td>
      <td>—</td>
      <td>—</td>
      <td className="ui-campaign-table-spend">{totals.spend}</td>
      <td>{totals.roas}</td>
      <td>{totals.cpl}</td>
      <td className={ctrTone}>{totals.ctr}</td>
      <td className="font-normal text-[var(--text-dim)]">{totals.impressions}</td>
      <td className="font-normal text-[var(--text-dim)]">{totals.clicks}</td>
      <td className="font-normal text-[var(--text-dim)]">{totals.conversions}</td>
      <td className="font-normal text-[var(--text-dim)]">{totals.frequency}</td>
      <td className="font-normal text-[var(--text-dim)]">{totals.cpm}</td>
      <td className="ui-campaign-table-chevron" />
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
  const tipoCode = campaignPresetCode(c.preset, c.objective);
  const ctrTone = campaignMetricToneClass(campaignMetricTone(c.ctr));

  return (
    <>
      <td onClick={(e) => e.stopPropagation()}>
        {c.status === "draft" ? (
          <span className="text-[10px] text-[var(--text-dimmer)]">—</span>
        ) : (
          <CampaignStatusToggle
            active={isActive}
            disabled={statusPendingId === String(c.id)}
            ariaLabel={statusAria}
            onChange={() => onToggleStatus?.(c.id, c.rawStatus)}
          />
        )}
      </td>

      <td className="min-w-[200px]">
        {c.status !== "draft" ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCampaign(String(c.id));
            }}
            className="ui-campaign-table-name text-left text-sm"
          >
            {c.name}
          </button>
        ) : (
          <p className="ui-campaign-table-name text-sm">{c.name}</p>
        )}
      </td>

      <td className="ui-campaign-table-client whitespace-nowrap text-sm">{c.client}</td>

      <td className="text-center">
        <span className={cn("ui-campaign-table-tipo", campaignPresetBadgeClass(c.preset ?? "default"))}>
          {tipoCode}
        </span>
      </td>

      <td className="whitespace-nowrap text-sm text-[var(--text-dim)]">{c.budget}</td>

      <td className="ui-campaign-table-spend whitespace-nowrap text-sm">{c.spend}</td>

      <td>
        {c.roas === "—" ? (
          <span className="text-[var(--text-dimmer)]">—</span>
        ) : (
          <div className="flex items-center justify-start gap-1">
            {c.trend === "up" ? (
              <TrendingUp size={12} className="text-[var(--success)]" />
            ) : (
              <TrendingDown size={12} className="text-[var(--danger)]" />
            )}
            <span
              className={cn(
                "font-heading text-sm font-semibold",
                c.trend === "up" ? "text-[var(--success)]" : "text-[var(--danger)]"
              )}
            >
              {c.roas}
            </span>
          </div>
        )}
      </td>

      <td className="whitespace-nowrap text-sm text-[var(--text-main)]">{c.cpl}</td>

      <td className={cn("text-sm", ctrTone)}>{c.ctr}</td>

      <td className="text-sm text-[var(--text-dim)]">{c.impressions}</td>
      <td className="text-sm text-[var(--text-dim)]">{c.clicks}</td>
      <td className="text-sm text-[var(--text-dim)]">{c.conversions}</td>
      <td className="text-sm text-[var(--text-dim)]">{c.frequency}</td>
      <td className="text-sm text-[var(--text-dim)]">{c.cpm}</td>

      <td className="ui-campaign-table-chevron">
        {c.status !== "draft" ? <ChevronRight size={16} strokeWidth={2} /> : null}
      </td>
    </>
  );
}

const TABLE_HEADERS = [
  "Status",
  "Campanha",
  "Cliente",
  "Tipo",
  "Budget",
  "Investido",
  "ROAS",
  "CPL",
  "CTR",
  "Impressões",
  "Cliques",
  "Conversões",
  "Freq.",
  "CPM",
  ""
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
      <div className="ui-campaign-table-shell py-16 text-center">
        <p className="font-heading font-semibold opacity-40 text-[var(--text-main)]">
          Nenhuma campanha encontrada
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="ui-campaign-table-shell">
          <CampaignGroupHeader groupKey={group.key} label={group.label} count={group.count} />

            <div className="overflow-x-auto">
              <table className="ui-campaign-table">
                <thead>
                  <tr>
                    {TABLE_HEADERS.map((label, i) => (
                      <th key={`${label}-${i}`} className={i === TABLE_HEADERS.length - 1 ? "ui-campaign-table-chevron" : undefined}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.campaigns.map((c) => {
                    const selected = selectedCampaignId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className={cn(
                          c.status !== "draft" && "cursor-pointer",
                          selected && "ui-campaign-table-row--selected"
                        )}
                        style={selected ? { background: CAMPAIGN_ROW_SELECTED_BG } : undefined}
                        onClick={() => {
                          if (c.status === "draft") return;
                          onSelectCampaign(String(c.id));
                        }}
                      >
                        <CampaignRowCells
                          c={c}
                          statusPendingId={statusPendingId}
                          onSelectCampaign={onSelectCampaign}
                          onToggleStatus={onToggleStatus}
                        />
                      </tr>
                    );
                  })}
                </tbody>
                {totalsOpen ? (
                  <tfoot>
                    <TotalsFooterRow totals={group.totals} />
                  </tfoot>
                ) : null}
              </table>
          </div>
        </div>
      ))}

      <p className="text-center text-xs text-[var(--text-dim)]">
        {totalCampaigns} campanha{totalCampaigns === 1 ? "" : "s"} em {groups.length} tipo
        {groups.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
