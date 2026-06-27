"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import { ZoneDetailPanel } from "@/components/audiences/ZoneDetailPanel";
import { AiZoneForm } from "@/components/audiences/create/AiZoneForm";
import { FormSelect } from "@/components/ui/FormSelect";
import { formatZoneHierarchySummary } from "@/lib/adset-display-summary";
import { DsModal } from "@/design-system/components/DsModal";

type Props = {
  value: string | null | undefined;
  disabled?: boolean;
  variant?: "default" | "adset";
  hideTitle?: boolean;
  onChange: (zoneId: string | null) => void;
};

export function ZonePicker({ value, disabled, variant = "default", hideTitle, onChange }: Props) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");
  const isAdset = variant === "adset";
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/zones")
      .then((r) => r.json())
      .then((j: { ok?: boolean; zones?: ZoneSummary[] }) => {
        setZones(j.zones ?? []);
      })
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, [showCreate, showEdit]);

  const selected = zones.find((z) => z.id === value);

  function handleZoneUpdated(updated: ZoneSummary) {
    setZones((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
  }

  const hierarchySummary =
    selected && formatZoneHierarchySummary(selected, t("zoneHierarchyEmpty"));

  return (
    <div className="space-y-2">
      {!isAdset ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[var(--text-main)]">{t("selectZone")}</span>
          <button
            type="button"
            className="ui-btn-secondary-accent inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium"
            disabled={disabled}
            onClick={() => setShowCreate(true)}
          >
            <Sparkles size={11} />
            {t("createZoneWithAi")}
          </button>
        </div>
      ) : hideTitle ? null : (
        <span className="text-xs font-semibold text-[var(--text-main)]">{t("zoneColumnLabel")}</span>
      )}

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("loading")}</p>
      ) : (
        <FormSelect
          value={value ?? ""}
          onChange={(id) => onChange(id || null)}
          placeholder={t("selectZonePlaceholder")}
          disabled={disabled}
          options={zones.map((z) => ({ value: z.id, label: z.name }))}
        />
      )}

      {selected && isAdset ? (
        <div className="campaign-creator-adset-picker-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-main)]">{selected.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-dim)]">
                {hierarchySummary}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-md p-1.5 text-[var(--text-dim)] transition hover:bg-[var(--surface-card)] hover:text-[var(--ui-accent)]"
              disabled={disabled}
              onClick={() => setShowEdit(true)}
              aria-label={t("editZone")}
              title={t("editZone")}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {!isAdset && selected?.description ? (
        <p className="text-xs text-[var(--text-dim)]">{selected.description}</p>
      ) : null}

      {isAdset ? (
        <button
          type="button"
          className="ui-btn-secondary-accent inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium"
          disabled={disabled}
          onClick={() => setShowCreate(true)}
        >
          <Sparkles size={13} />
          {t("createZoneWithAi")}
        </button>
      ) : null}

      <DsModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={tAud("newZone")}
        titleIcon={<MapPin size={16} />}
        width="lg"
      >
        <AiZoneForm
          embedded
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            fetch("/api/zones")
              .then((r) => r.json())
              .then((j: { zones?: ZoneSummary[] }) => {
                const list = j.zones ?? [];
                setZones(list);
                if (list[0]) onChange(list[0].id);
              });
          }}
        />
      </DsModal>

      {selected ? (
        <DsModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          title={selected.name}
          width="lg"
        >
          <ZoneDetailPanel
            zone={selected}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => {
              handleZoneUpdated(updated);
              setShowEdit(false);
            }}
          />
        </DsModal>
      ) : null}
    </div>
  );
}
