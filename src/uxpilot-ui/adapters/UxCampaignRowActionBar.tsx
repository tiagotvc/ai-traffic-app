"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ExternalLink,
  FolderOpen,
  Pause,
  Play,
  Tag,
  X,
} from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import type { CampaignTypeDto } from "@/hooks/useCampaignTypes";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import type { UxCampaignRow } from "@/uxpilot-ui/adapters/campaigns-mappers";
import {
  UxFloatingActionBar,
  type UxFloatingActionAnchor
} from "@/uxpilot-ui/adapters/UxFloatingActionBar";
import { useUxNavigate as useNavigate } from "@/uxpilot-ui/adapters/navigation";

type Props = {
  open: boolean;
  row: UxCampaignRow | null;
  anchor?: UxFloatingActionAnchor | null;
  customTypes: CampaignTypeDto[];
  pending?: boolean;
  onClose: () => void;
  onToggleStatus: () => void;
  onPresetChange: (preset: string) => void;
};

const pillClass =
  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-heading font-semibold transition-all duration-200 hover:brightness-110";
const pillStyle = {
  color: "var(--text-main)",
  background: "var(--filter-btn-bg)",
  borderColor: "var(--border-color)"
};

export function UxCampaignRowActionBar({
  open,
  row,
  anchor,
  customTypes,
  pending,
  onClose,
  onToggleStatus,
  onPresetChange
}: Props) {
  const navigate = useNavigate();
  const tPresets = useTranslations("campaignTypes");

  const presetOptions = useMemo(
    () => [
      ...CAMPAIGN_PRESETS.map((p) => ({ value: p, label: tPresets(p) })),
      ...customTypes.map((ct) => ({ value: `custom:${ct.id}`, label: ct.name }))
    ],
    [customTypes, tPresets]
  );

  if (!row) return null;

  const isActive = row.rawStatus === "ACTIVE" || row.status === "active";
  const metaUrl =
    row.metaAdAccountId && row.id
      ? `https://www.facebook.com/adsmanager/manage/campaigns?act=${row.metaAdAccountId.replace("act_", "")}&selected_campaign_ids=${row.id}`
      : null;

  return (
    <UxFloatingActionBar open={open} onClose={onClose} anchor={anchor}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {row.status !== "draft" ? (
          <button
            type="button"
            disabled={pending}
            onClick={onToggleStatus}
            className={pillClass}
            style={{
              borderColor: isActive ? "rgba(245,166,35,0.45)" : "rgba(16,185,129,0.45)",
              background: isActive ? "rgba(245,166,35,0.12)" : "rgba(16,185,129,0.12)",
              color: isActive ? "var(--ui-accent)" : "#10b981"
            }}
          >
            {isActive ? <Pause size={13} /> : <Play size={13} />}
            {isActive ? "Pausar" : "Ativar"}
          </button>
        ) : null}

        <FilterSelectDropdown
          icon={<Tag size={14} />}
          label="Categoria"
          placeholder="Categoria"
          value={row.preset ?? "default"}
          onChange={onPresetChange}
          options={presetOptions}
          menuPlacement="top"
        />

        {metaUrl ? (
          <a
            href={metaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={pillClass}
            style={pillStyle}
          >
            <ExternalLink size={13} />
            Ver na Meta
          </a>
        ) : null}

        <button
          type="button"
          onClick={() =>
            navigate(`/campaigns/${row.id}?client=${encodeURIComponent(row.clientSlug)}`)
          }
          className={pillClass}
          style={pillStyle}
        >
          <FolderOpen size={13} />
          Ver relatório
        </button>

        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className={pillClass}
          style={{ ...pillStyle, color: "var(--text-dim)" }}
        >
          <X size={14} />
        </button>
      </div>
    </UxFloatingActionBar>
  );
}
