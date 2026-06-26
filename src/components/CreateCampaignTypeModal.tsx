"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DsButton, DsModal } from "@/design-system";
import { MetricCatalogPicker } from "@/components/CampaignTableColumnsModal";
import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { CampaignTypeDto } from "@/hooks/useCampaignTypes";
import type { TableColumnRef } from "@/lib/campaign-table-layout";

export function CreateCampaignTypeModal({
  open,
  onClose,
  customMetrics,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  customMetrics: Array<{ id: string; name: string }>;
  onCreated: (type: CampaignTypeDto, applyPresetKey: string) => void;
}) {
  const t = useTranslations("campaignTypes");
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);
  const [metrics, setMetrics] = useState<TableColumnRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setShared(true);
      setMetrics([]);
      setError(null);
    }
  }, [open]);

  async function save() {
    if (!name.trim() || !metrics.length) {
      setError(t("validation"));
      return;
    }
    setSaving(true);
    setError(null);
    const metricKeys = metrics
      .filter((m): m is { kind: "metric"; key: MetricKey } => m.kind === "metric")
      .map((m) => m.key);
    if (!metricKeys.length) {
      setError(t("validation"));
      setSaving(false);
      return;
    }
    const res = await fetch("/api/campaign-types", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), metrics: metricKeys, shared })
    });
    const j = await res.json();
    setSaving(false);
    if (!j.ok) {
      setError(t("saveError"));
      return;
    }
    onCreated(j.type, `custom:${j.type.id}`);
    onClose();
  }

  return (
    <DsModal
      open={open}
      onClose={onClose}
      title={t("createType")}
      subtitle={t("createTypeHint")}
      width="lg"
      footer={
        <>
          <DsButton variant="secondary" size="sm" onClick={onClose}>
            {t("cancel")}
          </DsButton>
          <DsButton variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
            {t("save")}
          </DsButton>
        </>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("typeName")}
        className="ui-input w-full text-sm"
      />
      <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-dim)]">
        <input
          type="checkbox"
          checked={shared}
          onChange={(e) => setShared(e.target.checked)}
          className="accent-violet-600"
        />
        {t("sharedType")}
      </label>
      <div className="mt-4">
        <MetricCatalogPicker
          selected={metrics}
          onChange={setMetrics}
          customMetrics={customMetrics}
          max={8}
        />
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </DsModal>
  );
}

export function CampaignTypeSelect({
  value,
  customTypes,
  onChange,
  className
}: {
  value: string;
  customTypes: CampaignTypeDto[];
  onChange: (preset: string) => void;
  className?: string;
}) {
  const t = useTranslations("campaignTypes");

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? "ui-select !w-auto !py-1.5 text-xs"}
    >
      {CAMPAIGN_PRESETS.map((p) => (
        <option key={p} value={p}>
          {t(p)}
        </option>
      ))}
      {customTypes.length ? (
        <optgroup label={t("customTypes")}>
          {customTypes.map((ct) => (
            <option key={ct.id} value={`custom:${ct.id}`}>
              {ct.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}
