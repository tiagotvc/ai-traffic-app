"use client";

import {
  BarChart2,
  Bookmark,
  FileText,
  LayoutList,
  PenLine,
  Sparkles,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import {
  CreationModeChoiceCard,
  CreationModeChoiceGrid,
  creationModeModalMaxWidthClass
} from "@/components/campaign-creator/CreationModeChoiceCard";
import {
  CreatorAiModalShell,
  CreatorModalShell
} from "@/components/campaign-creator/CreatorModalShell";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import type { ReportTemplateConfig } from "@/components/reports/ReportsTemplatesControl";
import { REPORT_AI_CREDITS } from "@/components/reports/ReportsAiGenerateTrigger";
import { useAiCredits } from "@/hooks/useAiCredits";
import { cn } from "@/lib/cn";
import {
  BUILTIN_REPORT_TEMPLATES,
  builtinToConfig,
  type BuiltinTemplateId
} from "@/lib/reports/templates";
import { DsButton } from "@/design-system";

type ModalStep = "mode" | "standard" | "ai";
type GenerationMode = "standard" | "ai";

type SavedTpl = { id: string; name: string; config: ReportTemplateConfig };

type Props = {
  open: boolean;
  onClose: () => void;
  reportsV2: boolean;
  onApplyStandard: (config: {
    reportType: "simple" | "complete";
    templateId: BuiltinTemplateId | string;
    kind: "single" | "consolidated";
    metrics?: string[];
    periodPreset?: string | null;
    /** true quando o usuário escolhe um template de fato (não o padrão auto-selecionado). */
    explicit?: boolean;
  }) => void;
  onGenerateAi: (prompt: string) => Promise<boolean>;
  aiBusy?: boolean;
  currentReportType: "simple" | "complete";
  currentConfig: ReportTemplateConfig;
};

function TemplateChoiceCard({
  selected,
  title,
  description,
  icon: Icon,
  onSelect,
  badge
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--template-tile",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__title-row">
          <span className="campaign-creator-budget-choice-card__label">{title}</span>
          {badge ? <span className="campaign-creator-budget-choice-card__badge">{badge}</span> : null}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

export function ReportsViewModal({
  open,
  onClose,
  reportsV2,
  onApplyStandard,
  onGenerateAi,
  aiBusy = false,
  currentReportType,
  currentConfig
}: Props) {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const { refresh: refreshCredits } = useAiCredits();

  const [step, setStep] = useState<ModalStep>("mode");
  const [mode, setMode] = useState<GenerationMode | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  // O usuário clicou de fato num template? Se não (só o padrão auto-selecionado),
  // a geração respeita as métricas/período já selecionados na barra de filtros.
  const [templateTouched, setTemplateTouched] = useState(false);
  const [reportType, setReportType] = useState<"simple" | "complete">(currentReportType);
  const [savedTemplates, setSavedTemplates] = useState<SavedTpl[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("mode");
      setMode(null);
      setSelectedTemplate(null);
      setTemplateTouched(false);
      setReportType(currentReportType);
      setPrompt("");
      return;
    }
    setTemplateTouched(false);
    setReportType(currentReportType);
  }, [open, currentReportType]);

  useEffect(() => {
    if (!open || step !== "standard" || !reportsV2) return;
    fetch("/api/report-templates")
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setSavedTemplates(j.templates ?? []);
      })
      .catch(() => {});
  }, [open, step, reportsV2]);

  useEffect(() => {
    if (open && step === "standard" && selectedTemplate === null) {
      setSelectedTemplate("performance");
    }
  }, [open, step, selectedTemplate]);

  const selectedBuiltin = BUILTIN_REPORT_TEMPLATES.find((x) => x.id === selectedTemplate);
  const selectedSaved = savedTemplates.find((x) => x.id === selectedTemplate);
  const isConsolidated = selectedBuiltin?.kind === "consolidated";

  function handleClose() {
    if (aiBusy) return;
    onClose();
  }

  function handleModeContinue() {
    if (!mode) return;
    setStep(mode);
  }

  function handleStandardApply() {
    if (!selectedTemplate) return;

    if (selectedBuiltin?.kind === "consolidated") {
      onApplyStandard({
        reportType,
        templateId: "consolidated",
        kind: "consolidated"
      });
      onClose();
      return;
    }

    if (selectedSaved) {
      const c = selectedSaved.config;
      onApplyStandard({
        reportType: c.reportType ?? reportType,
        templateId: selectedSaved.id,
        kind: "single",
        metrics: c.metrics,
        periodPreset: c.periodPreset,
        explicit: true
      });
      onClose();
      return;
    }

    if (selectedBuiltin) {
      const c = builtinToConfig(selectedBuiltin);
      onApplyStandard({
        reportType: c?.reportType ?? reportType,
        templateId: selectedBuiltin.id,
        kind: "single",
        metrics: c?.metrics,
        periodPreset: c?.periodPreset,
        explicit: templateTouched
      });
      onClose();
      return;
    }
  }

  async function handleAiGenerate() {
    if (!prompt.trim() || aiBusy) return;
    const ok = await onGenerateAi(prompt.trim());
    if (ok) {
      void refreshCredits();
      onClose();
    }
  }

  async function saveTemplate() {
    if (!saveName.trim()) return;
    setSaveBusy(true);
    try {
      const res = await fetch("/api/report-templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          config: { ...currentConfig, reportType }
        })
      });
      const j = await res.json();
      if (j?.ok) {
        setSaveName("");
        const list = await fetch("/api/report-templates").then((r) => r.json());
        if (list?.ok) setSavedTemplates(list.templates ?? []);
      }
    } finally {
      setSaveBusy(false);
    }
  }

  if (step === "ai") {
    return (
      <CreatorAiModalShell
        open={open}
        onClose={handleClose}
        title={t("aiGenerateModalTitle")}
        subtitle={t("aiGenerateModalSubtitle")}
        titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
        width="md"
        aiCredits={REPORT_AI_CREDITS}
        onCancel={() => setStep("mode")}
        cancelLabel={t("viewModalBack")}
        onPrimary={() => void handleAiGenerate()}
        primaryLabel={t("aiGenerateButton")}
        primaryDisabled={!prompt.trim()}
        primaryLoading={aiBusy}
        showPrimaryCheck={false}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleAiGenerate();
            }
          }}
          placeholder={t("aiGeneratePlaceholder")}
          rows={4}
          className="ui-input w-full resize-none text-sm"
          disabled={aiBusy}
          autoFocus
        />
      </CreatorAiModalShell>
    );
  }

  if (step === "standard") {
    return (
      <CreatorModalShell
        open={open}
        onClose={handleClose}
        title={t("viewModalStandardTitle")}
        subtitle={t("viewModalStandardSubtitle")}
        titleIcon={<FileText size={15} strokeWidth={2.25} />}
        width="xl"
        hideFooter
        footer={
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border-color)] px-5 py-3">
            <DsButton variant="secondary" size="md" onClick={() => setStep("mode")}>
              {t("viewModalBack")}
            </DsButton>
            <DsButton
              variant="accent"
              size="md"
              onClick={handleStandardApply}
              disabled={!selectedTemplate}
              className="inline-flex items-center gap-1.5"
            >
              <Sparkles size={14} strokeWidth={2.25} aria-hidden />
              {t("viewModalGenerate")}
            </DsButton>
          </footer>
        }
      >
        <div className="space-y-4">
          {!isConsolidated ? (
            <div className="campaign-creator-card campaign-creator-card--compact space-y-2 px-3 py-2.5">
              <FilterSelectDropdown
                className="min-w-0 w-full max-w-sm"
                creatorField
                icon={<BarChart2 size={14} />}
                label={t("reportTypeLabel")}
                placeholder={t("typeSimple")}
                clearable={false}
                options={[
                  { value: "simple", label: t("typeSimple") },
                  { value: "complete", label: t("typeComplete") }
                ]}
                value={reportType}
                onChange={(v) => setReportType((v || "simple") as "simple" | "complete")}
              />
              <p className="text-[11px] leading-relaxed text-[var(--text-dim)]">
                {reportType === "complete" ? t("typeCompleteHint") : t("typeSimpleHint")}
              </p>
            </div>
          ) : null}

          <div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            role="radiogroup"
            aria-label={t("templatesTitle")}
          >
            {BUILTIN_REPORT_TEMPLATES.map((tpl) => {
              const Icon = tpl.kind === "consolidated" ? LayoutList : BarChart2;
              const title =
                tpl.kind === "consolidated"
                  ? t("consolidatedButton")
                  : t(`ready.${tpl.id}.title`);
              const description =
                tpl.kind === "consolidated"
                  ? t("consolidatedHint")
                  : t(`ready.${tpl.id}.desc`);
              return (
                <TemplateChoiceCard
                  key={tpl.id}
                  selected={selectedTemplate === tpl.id}
                  title={title}
                  description={description}
                  icon={Icon}
                  badge={tpl.id === "performance" ? t("templateMostUsed") : undefined}
                  onSelect={() => {
                    setSelectedTemplate(tpl.id);
                    setTemplateTouched(true);
                    if (tpl.reportType) setReportType(tpl.reportType);
                  }}
                />
              );
            })}
            {savedTemplates.map((tpl) => (
              <TemplateChoiceCard
                key={tpl.id}
                selected={selectedTemplate === tpl.id}
                title={tpl.name}
                description={t("templateSavedDesc", {
                  type: tpl.config.reportType,
                  count: tpl.config.metrics?.length ?? 0
                })}
                icon={FileText}
                onSelect={() => {
                  setSelectedTemplate(tpl.id);
                  setTemplateTouched(true);
                }}
              />
            ))}
          </div>

          {reportsV2 ? (
            <div className="campaign-creator-card campaign-creator-card--compact space-y-3 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                  <Bookmark size={15} strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-main)]">{t("templateSaveSection")}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-dim)]">
                    {t("templateSaveSectionHint")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t("templateNamePlaceholder")}
                  className="ui-input min-w-0 flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void saveTemplate()}
                  disabled={saveBusy || !saveName.trim()}
                  className="ui-btn-accent-outline shrink-0 px-4 py-2 text-xs font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("templateSave")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </CreatorModalShell>
    );
  }

  const modeOptionCount = reportsV2 ? 2 : 1;

  return (
    <CreatorModalShell
      open={open}
      onClose={handleClose}
      title={t("viewModalTitle")}
      subtitle={t("viewModalSubtitle")}
      titleIcon={<FileText size={15} strokeWidth={2.25} />}
      width="md"
      className={creationModeModalMaxWidthClass(modeOptionCount)}
      contentClassName="pb-4"
      onCancel={handleClose}
      cancelLabel={tCommon("cancel")}
      onPrimary={handleModeContinue}
      primaryLabel={t("viewModalContinue")}
      primaryDisabled={mode === null}
      showPrimaryCheck={false}
    >
      <CreationModeChoiceGrid ariaLabel={t("viewModalTitle")}>
        <CreationModeChoiceCard
          selected={mode === "standard"}
          label={t("viewModalStandard")}
          description={t("viewModalStandardHint")}
          icon={PenLine}
          onSelect={() => setMode("standard")}
        />
        {reportsV2 ? (
          <CreationModeChoiceCard
            selected={mode === "ai"}
            label={t("viewModalAi")}
            description={t("viewModalAiHint")}
            icon={Sparkles}
            onSelect={() => setMode("ai")}
            aiCredits={REPORT_AI_CREDITS}
          />
        ) : null}
      </CreationModeChoiceGrid>
    </CreatorModalShell>
  );
}
