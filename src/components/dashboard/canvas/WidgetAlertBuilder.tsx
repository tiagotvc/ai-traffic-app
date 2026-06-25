"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { AlertCardPreview } from "@/components/dashboard/canvas/widgets/alerts/AlertCardWidget";
import { BuilderColorInput, BuilderField, BuilderPreviewFrame } from "@/components/dashboard/canvas/WidgetBuilderUi";
import type { AlertType } from "@/db/entities/Alert";
import {
  ALERT_THEME_PRESETS,
  DEFAULT_ALERT_WIDGET_CONFIG,
  GOAL_ALERT_TYPES,
  type AlertIconKey,
  type AlertSourceKind,
  type AlertTemplate,
  type AlertTheme,
  type AlertWidgetConfig,
  defaultTemplateForSource,
  parseAlertWidgetConfig
} from "@/lib/dashboard/alert-widget-config";
import { METRIC_CATALOG, type MetricKey } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/cn";

type Step = "type" | "source" | "template" | "visual";

type AutomationRule = {
  id: string;
  name: string;
  enabled: boolean;
  condition: { metric: string; op: string; value: number };
};

type LearningOption = { id: string; title: string; impact: string };

const SOURCE_KINDS: AlertSourceKind[] = [
  "learning",
  "goal",
  "variation",
  "automation",
  "learning_phase"
];

const TEMPLATES: AlertTemplate[] = ["metric_threshold", "brain_insight", "brain_progress", "compact"];
const THEMES: AlertTheme[] = ["auto", "premium", "clean", "minimal", "custom"];
const ICONS: AlertIconKey[] = ["brain", "alert", "target", "zap", "trend", "lightbulb", "gauge"];

export function WidgetAlertBuilder({
  config,
  onChange,
  hideHeader = false
}: {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  hideHeader?: boolean;
}) {
  const t = useTranslations("dashboardWidgets");
  const parsed = useMemo(() => parseAlertWidgetConfig(config), [config]);
  const [step, setStep] = useState<Step>("type");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [learnings, setLearnings] = useState<LearningOption[]>([]);
  const [creatingRule, setCreatingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleMetric, setNewRuleMetric] = useState("ctr");
  const [newRuleOp, setNewRuleOp] = useState("lt");
  const [newRuleValue, setNewRuleValue] = useState(1);

  useEffect(() => {
    void fetch("/api/automation/rules")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.rules)) setRules(j.rules);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (parsed.source.kind !== "learning") return;
    void fetch("/api/dashboard/widgets/brain.learnings/data")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && Array.isArray(j.data?.items)) {
          setLearnings(
            j.data.items.map((x: { id: string; title: string; impact: string }) => ({
              id: x.id,
              title: x.title,
              impact: x.impact
            }))
          );
        }
      })
      .catch(() => {});
  }, [parsed.source.kind]);

  const patch = useCallback(
    (next: Partial<AlertWidgetConfig>) => {
      const merged: AlertWidgetConfig = {
        ...parsed,
        ...next,
        source: next.source ?? parsed.source,
        visual: { ...parsed.visual, ...(next.visual ?? {}) }
      };
      if (next.source && !next.template) {
        merged.template = defaultTemplateForSource(next.source);
      }
      onChange(merged as unknown as Record<string, unknown>);
    },
    [onChange, parsed]
  );

  const steps: Step[] = ["type", "source", "template", "visual"];

  function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">{title}</p>
        {children}
      </div>
    );
  }

  async function createInlineRule() {
    setCreatingRule(true);
    try {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newRuleName || t("alertAutomationDefaultName"),
          enabled: true,
          condition: {
            metric: newRuleMetric,
            op: newRuleOp,
            value: Number(newRuleValue)
          },
          action: { type: "alert_only" }
        })
      });
      const j = await res.json();
      if (j.ok && j.rule) {
        setRules((cur) => [j.rule, ...cur]);
        patch({ source: { kind: "automation", ruleId: j.rule.id } });
        setStep("template");
      }
    } finally {
      setCreatingRule(false);
    }
  }

  return (
    <div className="space-y-4">
      {!hideHeader ? (
        <div>
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("alertBuilderTitle")}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("alertBuilderHint")}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              step === s ? "text-white" : "border"
            )}
            style={
              step === s
                ? { background: "#4f46e5" }
                : { borderColor: "var(--border-color)", color: "var(--text-dim)" }
            }
          >
            {t(`alertBuilderStep_${s}`)}
          </button>
        ))}
      </div>

      {step === "type" ? (
        <Section title={t("alertBuilderTypeTitle")}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOURCE_KINDS.map((kind) => {
              const disabled = kind === "learning_phase";
              const active = parsed.source.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (kind === "learning") patch({ source: { kind: "learning", learningId: "latest" } });
                    else if (kind === "goal")
                      patch({ source: { kind: "goal", alertType: "ROAS_BELOW_MIN" as AlertType } });
                    else if (kind === "variation")
                      patch({ source: { kind: "variation", metricKey: "ctr" as MetricKey } });
                    else if (kind === "automation")
                      patch({ source: { kind: "automation", ruleId: rules[0]?.id ?? "" } });
                    else patch({ source: { kind: "learning_phase" } });
                    if (!disabled) setStep("source");
                  }}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-colors disabled:opacity-50",
                    active && "ring-2 ring-indigo-400"
                  )}
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--text-main)" }}>
                    {t(`alertSourceKind_${kind}`)}
                  </span>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>
                    {t(`alertSourceKindHint_${kind}`)}
                  </p>
                  {disabled ? (
                    <span className="mt-2 inline-block text-[10px] font-bold uppercase text-amber-600">
                      {t("comingSoon")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}

      {step === "source" ? (
        <Section title={t("alertBuilderSourceTitle")}>
          {parsed.source.kind === "learning" ? (
            <BuilderField label={t("alertLearningPick")}>
              <select
                className="ui-select"
                value={parsed.source.learningId ?? "latest"}
                onChange={(e) =>
                  patch({ source: { kind: "learning", learningId: e.target.value || "latest" } })
                }
              >
                <option value="latest">{t("alertLearningLatest")}</option>
                {learnings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </BuilderField>
          ) : null}

          {parsed.source.kind === "goal" ? (
            <BuilderField label={t("alertGoalPick")}>
              <select
                className="ui-select"
                value={parsed.source.alertType}
                onChange={(e) =>
                  patch({ source: { kind: "goal", alertType: e.target.value as AlertType } })
                }
              >
                {GOAL_ALERT_TYPES.map((at) => (
                  <option key={at} value={at}>
                    {t(`alertGoalType_${at}`)}
                  </option>
                ))}
              </select>
            </BuilderField>
          ) : null}

          {parsed.source.kind === "variation" ? (
            <BuilderField label={t("alertVariationMetric")}>
              <select
                className="ui-select"
                value={parsed.source.metricKey}
                onChange={(e) =>
                  patch({ source: { kind: "variation", metricKey: e.target.value as MetricKey } })
                }
              >
                {METRIC_CATALOG.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.key}
                  </option>
                ))}
              </select>
            </BuilderField>
          ) : null}

          {parsed.source.kind === "automation" ? (
            <div className="space-y-3">
              <BuilderField label={t("alertAutomationPick")}>
                <select
                  className="ui-select"
                  value={parsed.source.ruleId}
                  onChange={(e) => patch({ source: { kind: "automation", ruleId: e.target.value } })}
                >
                  <option value="">{t("alertAutomationSelect")}</option>
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.condition.metric} {r.condition.op} {r.condition.value})
                    </option>
                  ))}
                </select>
              </BuilderField>
              <div
                className="rounded-xl border p-3"
                style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
              >
                <p className="mb-2 text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                  {t("alertAutomationCreateInline")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="ui-input col-span-2"
                    placeholder={t("alertAutomationNamePlaceholder")}
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                  />
                  <select className="ui-select" value={newRuleMetric} onChange={(e) => setNewRuleMetric(e.target.value)}>
                    {["ctr", "cpl", "cpa", "spend", "conversions", "roas"].map((m) => (
                      <option key={m} value={m}>
                        {m.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <select className="ui-select" value={newRuleOp} onChange={(e) => setNewRuleOp(e.target.value)}>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                    <option value="gte">≥</option>
                  </select>
                  <input
                    className="ui-input"
                    type="number"
                    value={newRuleValue}
                    onChange={(e) => setNewRuleValue(Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  disabled={creatingRule}
                  onClick={() => void createInlineRule()}
                  className="ui-btn-brand mt-2 inline-flex items-center gap-1.5 text-xs"
                >
                  <Plus size={14} />
                  {creatingRule ? t("alertAutomationCreating") : t("alertAutomationCreateBtn")}
                </button>
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}

      {step === "template" ? (
        <Section title={t("alertBuilderTemplateTitle")}>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => patch({ template: tpl })}
                className={cn(
                  "rounded-xl border p-3 text-left text-xs font-semibold",
                  parsed.template === tpl && "ring-2 ring-indigo-400"
                )}
                style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
              >
                {t(`alertTemplate_${tpl}`)}
              </button>
            ))}
          </div>
          <BuilderField label={t("alertLayoutPick")}>
            <select
              className="ui-select"
              value={parsed.visual.layout ?? "auto"}
              onChange={(e) =>
                patch({
                  visual: {
                    ...parsed.visual,
                    layout: e.target.value as "auto" | "horizontal" | "vertical"
                  }
                })
              }
            >
              <option value="auto">{t("alertLayoutAuto")}</option>
              <option value="horizontal">{t("alertLayoutHorizontal")}</option>
              <option value="vertical">{t("alertLayoutVertical")}</option>
            </select>
          </BuilderField>
        </Section>
      ) : null}

      {step === "visual" ? (
        <Section title={t("alertBuilderVisualTitle")}>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => {
                  const preset =
                    theme !== "custom"
                      ? ALERT_THEME_PRESETS[theme as Exclude<AlertTheme, "custom">]
                      : null;
                  patch({
                    visual: {
                      ...parsed.visual,
                      theme,
                      accentColor: preset?.accent,
                      iconBgColor: preset?.iconBg,
                      cardBgColor: preset?.cardBg
                    }
                  });
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize",
                  parsed.visual.theme === theme && "ring-2 ring-indigo-400"
                )}
                style={{ borderColor: "var(--border-color)" }}
              >
                {t(`alertTheme_${theme}`)}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BuilderColorInput
              label={t("alertColorAccent")}
              value={parsed.visual.accentColor ?? ALERT_THEME_PRESETS.clean.accent}
              onChange={(v) => patch({ visual: { ...parsed.visual, theme: "custom", accentColor: v } })}
            />
            <BuilderColorInput
              label={t("alertColorIconBg")}
              value={parsed.visual.iconBgColor ?? ALERT_THEME_PRESETS.clean.iconBg}
              onChange={(v) => patch({ visual: { ...parsed.visual, theme: "custom", iconBgColor: v } })}
            />
            <BuilderColorInput
              label={t("alertColorCardBg")}
              value={parsed.visual.cardBgColor ?? ALERT_THEME_PRESETS.clean.cardBg}
              onChange={(v) => patch({ visual: { ...parsed.visual, theme: "custom", cardBgColor: v } })}
            />
          </div>
          <BuilderField label={t("alertIconPick")}>
            <select
              className="ui-select"
              value={parsed.visual.icon ?? "alert"}
              onChange={(e) =>
                patch({ visual: { ...parsed.visual, icon: e.target.value as AlertIconKey } })
              }
            >
              {ICONS.map((ic) => (
                <option key={ic} value={ic}>
                  {ic}
                </option>
              ))}
            </select>
          </BuilderField>
        </Section>
      ) : null}

      <BuilderPreviewFrame title={t("configPreview")}>
        <AlertCardPreview config={parsed} />
      </BuilderPreviewFrame>
    </div>
  );
}

export function defaultAlertWidgetConfigRecord(): Record<string, unknown> {
  return DEFAULT_ALERT_WIDGET_CONFIG as unknown as Record<string, unknown>;
}
