"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { MetricCatalogPicker } from "@/components/CampaignTableColumnsModal";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";
import { useCampaignTypes } from "@/hooks/useCampaignTypes";
import { Link, useRouter } from "@/i18n/navigation";
import { PRESET_METRICS } from "@/lib/campaign-presets";
import { metricKeysToColumns } from "@/lib/campaign-table-metrics";
import type { MetricKey } from "@/lib/dashboard-metrics";
import type { TableColumnRef } from "@/lib/campaign-table-layout";

const NEW_CUSTOM = "__new__";
const DEFAULT_METRIC_COLS = metricKeysToColumns(PRESET_METRICS.default);

export function CampaignTableColumnsPage() {
  const t = useTranslations("campaignTableLayout");
  const tTypes = useTranslations("campaignTypes");
  const router = useRouter();
  const tableLayout = useCampaignTableLayout();
  const { types: customTypes, createType, updateType, deleteType, loading: typesLoading } =
    useCampaignTypes();

  const [customSelection, setCustomSelection] = useState<string>(NEW_CUSTOM);
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);
  const [draftMetrics, setDraftMetrics] = useState<TableColumnRef[]>(DEFAULT_METRIC_COLS);
  const [tab, setTab] = useState<"metrics" | "formula">("metrics");
  const [formulaName, setFormulaName] = useState("");
  const [formulaExpr, setFormulaExpr] = useState("");
  const [formulaShared, setFormulaShared] = useState(false);
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCustomType = useCallback(
    (id: string) => {
      const found = customTypes.find((ct) => ct.id === id);
      if (!found) return;
      setName(found.name);
      setShared(found.shared);
      setDraftMetrics(metricKeysToColumns(found.metrics));
    },
    [customTypes]
  );

  useEffect(() => {
    if (customSelection === NEW_CUSTOM) {
      setName("");
      setShared(true);
      setDraftMetrics(DEFAULT_METRIC_COLS);
      return;
    }
    loadCustomType(customSelection);
  }, [customSelection, loadCustomType]);

  function resetToDefaultMetrics() {
    setDraftMetrics([...DEFAULT_METRIC_COLS]);
  }

  async function createFormula() {
    setFormulaError(null);
    const res = await fetch("/api/custom-metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formulaName,
        formula: formulaExpr,
        format: "number",
        shared: formulaShared
      })
    });
    const j = await res.json();
    if (!j.ok) {
      setFormulaError(j.error ?? t("formulaError"));
      return;
    }
    await tableLayout.reload();
    setFormulaName("");
    setFormulaExpr("");
    setTab("metrics");
  }

  async function handleSave() {
    setSaveError(null);
    const trimmed = name.trim();
    const metricKeys = draftMetrics
      .filter((c): c is { kind: "metric"; key: MetricKey } => c.kind === "metric")
      .map((c) => c.key);
    if (!trimmed) {
      setSaveError(tTypes("validation"));
      return;
    }
    if (!metricKeys.length) {
      setSaveError(tTypes("validation"));
      return;
    }
    setSaving(true);
    try {
      if (customSelection === NEW_CUSTOM) {
        const created = await createType({ name: trimmed, metrics: metricKeys, shared });
        if (!created) {
          setSaveError(tTypes("saveError"));
          return;
        }
        setCustomSelection(created.id);
      } else {
        const updated = await updateType(customSelection, {
          name: trimmed,
          metrics: metricKeys,
          shared
        });
        if (!updated) {
          setSaveError(tTypes("saveError"));
          return;
        }
      }
      router.push("/campaigns");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (customSelection === NEW_CUSTOM) return;
    if (!window.confirm(t("deleteTypeConfirm"))) return;
    const ok = await deleteType(customSelection);
    if (ok) {
      setCustomSelection(NEW_CUSTOM);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/campaigns" className="text-xs text-slate-500 hover:text-violet-600">
          ← {t("backToCampaigns")}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">{t("columnsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("columnsPageHint")}</p>
      </div>

      <div className="ui-card space-y-4 p-5">
        <div>
          <label className="text-xs font-medium text-slate-600">{t("typeNameLabel")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("customNamePlaceholder")}
            className="ui-input mt-1 w-full text-sm"
            autoFocus={customSelection === NEW_CUSTOM}
          />
          <p className="mt-1 text-[11px] text-slate-500">{t("typeNameHint")}</p>
        </div>

        {customTypes.length > 0 ? (
          <div>
            <label className="text-xs font-medium text-slate-600">{t("editExistingTypeLabel")}</label>
            <select
              className="ui-select mt-1 w-full text-sm"
              value={customSelection}
              onChange={(e) => setCustomSelection(e.target.value)}
              disabled={typesLoading}
            >
              <option value={NEW_CUSTOM}>{t("createNewType")}</option>
              {customTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
            className="accent-violet-600"
          />
          {tTypes("sharedType")}
        </label>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
          <button
            type="button"
            className={`text-xs font-medium ${tab === "metrics" ? "text-violet-700" : "text-slate-500"}`}
            onClick={() => setTab("metrics")}
          >
            {t("tabColumns")}
          </button>
          <button
            type="button"
            className={`text-xs font-medium ${tab === "formula" ? "text-violet-700" : "text-slate-500"}`}
            onClick={() => setTab("formula")}
          >
            {t("tabFormula")}
          </button>
        </div>

        {tab === "metrics" ? (
          <MetricCatalogPicker
            selected={draftMetrics}
            onChange={setDraftMetrics}
            customMetrics={tableLayout.customMetrics}
            max={8}
          />
        ) : (
          <div className="space-y-3 text-sm">
            <input
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              placeholder={t("formulaName")}
              className="ui-input w-full text-xs"
            />
            <input
              value={formulaExpr}
              onChange={(e) => setFormulaExpr(e.target.value)}
              placeholder={t("formulaPlaceholder")}
              className="ui-input w-full font-mono text-xs"
            />
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={formulaShared}
                onChange={(e) => setFormulaShared(e.target.checked)}
                className="accent-violet-600"
              />
              {t("formulaShared")}
            </label>
            {formulaError ? <p className="text-xs text-red-600">{formulaError}</p> : null}
            <button type="button" className="ui-btn-primary text-xs" onClick={() => void createFormula()}>
              {t("createFormula")}
            </button>
          </div>
        )}

        {saveError ? <p className="text-xs text-red-600">{saveError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className="ui-btn-secondary text-xs" onClick={resetToDefaultMetrics}>
            {t("useDefaultMetrics")}
          </button>
          {customSelection !== NEW_CUSTOM ? (
            <button type="button" className="ui-btn-secondary text-xs text-red-600" onClick={() => void handleDelete()}>
              {t("deleteType")}
            </button>
          ) : null}
          <Link href="/campaigns" className="ui-btn-secondary text-xs">
            {t("cancel")}
          </Link>
          <button
            type="button"
            className="ui-btn-primary text-xs"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
