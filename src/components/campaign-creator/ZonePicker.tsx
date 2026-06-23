"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import { AiZoneForm } from "@/components/audiences/create/AiZoneForm";

type Props = {
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (zoneId: string | null) => void;
};

export function ZonePicker({ value, disabled, onChange }: Props) {
  const t = useTranslations("campaignCreator");
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/zones")
      .then((r) => r.json())
      .then((j: { ok?: boolean; zones?: ZoneSummary[] }) => {
        setZones(j.zones ?? []);
      })
      .catch(() => setZones([]))
      .finally(() => setLoading(false));
  }, [showCreate]);

  const selected = zones.find((z) => z.id === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[var(--text-main)]">{t("selectZone")}</span>
        <button
          type="button"
          className="ui-link-amber text-xs"
          disabled={disabled}
          onClick={() => setShowCreate(true)}
        >
          {t("createZoneWithAi")}
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-dim)]">{t("loading")}</p>
      ) : (
        <select
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 py-2 text-sm"
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">{t("selectZonePlaceholder")}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      )}

      {selected?.description ? (
        <p className="text-xs text-[var(--text-dim)]">{selected.description}</p>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
            <AiZoneForm
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
