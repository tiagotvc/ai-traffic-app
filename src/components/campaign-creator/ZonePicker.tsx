"use client";

import { useEffect, useState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import type { ZoneSummary } from "@/components/audiences/ZonesLibraryClient";
import { AiZoneForm } from "@/components/audiences/create/AiZoneForm";
import { FormSelect } from "@/components/ui/FormSelect";
import { DsModal } from "@/design-system/components/DsModal";

type Props = {
  value: string | null | undefined;
  disabled?: boolean;
  onChange: (zoneId: string | null) => void;
};

export function ZonePicker({ value, disabled, onChange }: Props) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");
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
          className="ui-btn-secondary-accent inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium"
          disabled={disabled}
          onClick={() => setShowCreate(true)}
        >
          <Sparkles size={11} />
          {t("createZoneWithAi")}
        </button>
      </div>

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

      {selected?.description ? (
        <p className="text-xs text-[var(--text-dim)]">{selected.description}</p>
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
    </div>
  );
}
