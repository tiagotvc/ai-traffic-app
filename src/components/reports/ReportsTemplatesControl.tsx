"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookMarked, Trash2 } from "lucide-react";

import { DsButton, DsModal } from "@/design-system";

export type ReportTemplateConfig = {
  reportType: "simple" | "complete";
  metrics: string[];
  periodPreset?: string | null;
};

type Tpl = { id: string; name: string; config: ReportTemplateConfig };

/** R3.11 — salvar/aplicar templates de relatório. Gate v2 fica no pai. */
export function ReportsTemplatesControl({
  current,
  onApply
}: {
  current: ReportTemplateConfig;
  onApply: (config: ReportTemplateConfig) => void;
}) {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/report-templates");
    const j = await res.json();
    if (j?.ok) setTemplates(j.templates ?? []);
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/report-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), config: current })
      });
      const j = await res.json();
      if (j?.ok) {
        setName("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/report-templates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-secondary inline-flex items-center gap-1.5"
      >
        <BookMarked size={14} aria-hidden />
        {t("templatesButton")}
      </button>

      <DsModal
        open={open}
        onClose={() => setOpen(false)}
        title={t("templatesTitle")}
        subtitle={t("templatesSubtitle")}
        titleIcon={<BookMarked size={15} strokeWidth={2.25} />}
        width="md"
        footer={
          <DsButton variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {tCommon("close")}
          </DsButton>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("templateNamePlaceholder")}
              className="ui-input min-w-0 flex-1 text-sm"
            />
            <DsButton
              variant="primary"
              size="sm"
              onClick={() => void save()}
              disabled={busy || !name.trim()}
            >
              {t("templateSave")}
            </DsButton>
          </div>

          {templates.length === 0 ? (
            <p className="text-xs text-[var(--text-dimmer)]">{t("templatesEmpty")}</p>
          ) : (
            <div className="space-y-1.5">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-main)]">{tpl.name}</p>
                    <p className="text-[11px] text-[var(--text-dimmer)]">
                      {tpl.config.reportType} · {tpl.config.metrics?.length ?? 0} métricas
                      {tpl.config.periodPreset ? ` · ${tpl.config.periodPreset}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <DsButton
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onApply(tpl.config);
                        setOpen(false);
                      }}
                    >
                      {t("templateApply")}
                    </DsButton>
                    <button
                      type="button"
                      onClick={() => void remove(tpl.id)}
                      className="text-red-500 transition-colors hover:text-red-600"
                      title={t("templateDelete")}
                      aria-label={t("templateDelete")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DsModal>
    </>
  );
}
