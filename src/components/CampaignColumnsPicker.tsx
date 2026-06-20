"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  ALL_CAMPAIGN_COLUMNS,
  COLUMN_I18N_KEYS,
  DEFAULT_CAMPAIGN_COLUMNS,
  loadCampaignColumns,
  saveCampaignColumns,
  type CampaignColumnId
} from "@/lib/campaign-table-columns";

export function CampaignColumnsPicker({
  onChange
}: {
  onChange?: (cols: CampaignColumnId[]) => void;
}) {
  const t = useTranslations("campaignsPage");
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState<CampaignColumnId[]>(() => loadCampaignColumns());

  function toggle(id: CampaignColumnId) {
    setCols((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      if (!next.length) return prev;
      return next;
    });
  }

  function apply() {
    saveCampaignColumns(cols);
    onChange?.(cols);
    setOpen(false);
  }

  function resetDefault() {
    setCols([...DEFAULT_CAMPAIGN_COLUMNS]);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-secondary text-sm"
      >
        {t("columns")}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-[var(--surface-card)] p-4 shadow-xl">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("columnsTitle")}</h3>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{t("columnsHint")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ALL_CAMPAIGN_COLUMNS.map((id) => (
                <label key={id} className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={cols.includes(id)}
                    onChange={() => toggle(id)}
                    className="accent-violet-600"
                  />
                  {t(COLUMN_I18N_KEYS[id] as "colCampaign")}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={resetDefault} className="ui-btn-secondary text-xs">
                {t("columnsDefault")}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="ui-btn-secondary text-xs">
                {t("columnsCancel")}
              </button>
              <button type="button" onClick={apply} className="ui-btn-primary text-xs">
                {t("columnsApply")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
