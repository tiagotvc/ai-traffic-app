"use client";

import {
  BarChart2,
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
  CreatorAiModalShell,
  CreatorModalShell
} from "@/components/campaign-creator/CreatorModalShell";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { AiCreditCostHint } from "@/components/ui/AiCreditCostHint";
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
  }) => void;
  onGenerateAi: (prompt: string) => Promise<boolean>;
  aiBusy?: boolean;
  currentReportType: "simple" | "complete";
  currentConfig: ReportTemplateConfig;
};

function ModeChoiceCard({
  selected,
  label,
  description,
  icon: Icon,
  onSelect,
  badge
}: {
  selected: boolean;
  label: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row h-full min-h-[9.5rem]",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
          {label}
          {badge ? <span className="ml-2 inline-flex align-middle">{badge}</span> : null}
        </span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

function TemplateChoiceCard({
  selected,
  title,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card h-full min-h-[8.5rem] text-left",
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
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label">{title}</span>
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
      setReportType(currentReportType);
      setPrompt("");
      return;
    }
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
        periodPreset: c.periodPreset
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
        periodPreset: c?.periodPreset
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
        onCancel={() => setStep("mode")}
        cancelLabel={t("viewModalBack")}
        onPrimary={handleStandardApply}
        primaryLabel={t("viewModalGenerate")}
        primaryDisabled={!selectedTemplate}
        showPrimaryCheck={false}
      >
        <div className="space-y-5">
          {!isConsolidated ? (
            <FilterSelectDropdown
              className="min-w-0 w-full max-w-xs"
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
                  onSelect={() => setSelectedTemplate(tpl.id)}
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
                onSelect={() => setSelectedTemplate(tpl.id)}
              />
            ))}
          </div>

          {reportsV2 ? (
            <div className="rounded-lg border border-[var(--border-color)] p-3">
              <p className="text-xs font-medium text-[var(--text-main)]">{t("templateSaveSection")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t("templateNamePlaceholder")}
                  className="ui-input min-w-0 flex-1 text-sm"
                />
                <DsButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void saveTemplate()}
                  disabled={saveBusy || !saveName.trim()}
                >
                  {t("templateSave")}
                </DsButton>
              </div>
            </div>
          ) : null}
        </div>
      </CreatorModalShell>
    );
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={handleClose}
      title={t("viewModalTitle")}
      subtitle={t("viewModalSubtitle")}
      titleIcon={<FileText size={15} strokeWidth={2.25} />}
      width="md"
      className="max-w-xl"
      contentClassName="pb-4"
      onCancel={handleClose}
      cancelLabel={tCommon("cancel")}
      onPrimary={handleModeContinue}
      primaryLabel={t("viewModalContinue")}
      primaryDisabled={mode === null}
      showPrimaryCheck={false}
    >
      <div
        className="grid items-stretch gap-4 sm:grid-cols-2"
        role="radiogroup"
        aria-label={t("viewModalTitle")}
      >
        <ModeChoiceCard
          selected={mode === "standard"}
          label={t("viewModalStandard")}
          description={t("viewModalStandardHint")}
          icon={PenLine}
          onSelect={() => setMode("standard")}
        />
        {reportsV2 ? (
          <ModeChoiceCard
            selected={mode === "ai"}
            label={t("viewModalAi")}
            description={t("viewModalAiHint")}
            icon={Sparkles}
            onSelect={() => setMode("ai")}
            badge={
              <AiCreditCostHint
                kind={REPORT_AI_CREDITS.kind}
                calls={REPORT_AI_CREDITS.calls}
                variant="pill"
              />
            }
          />
        ) : null}
      </div>
    </CreatorModalShell>
  );
}
