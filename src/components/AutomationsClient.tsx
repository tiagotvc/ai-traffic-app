"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { KpiCard } from "@/components/ui/KpiCard";

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  condition: { metric?: string; op?: string; value?: number; minSpend?: number };
  action: { type?: string };
  createdAt: string;
};

const TEMPLATES = [
  {
    id: "cpl",
    name: "CPL acima da meta",
    condition: { metric: "cpl", op: "gt", value: 50, minSpend: 30 },
    action: { type: "pause_campaign" }
  },
  {
    id: "spend",
    name: "Gasto sem conversão",
    condition: { metric: "spend", op: "gt", value: 100, minSpend: 50 },
    action: { type: "pause_campaign" }
  },
  {
    id: "alert",
    name: "Só alertar (CPL alto)",
    condition: { metric: "cpl", op: "gt", value: 40 },
    action: { type: "alert_only" }
  }
] as const;

function formatCondition(c: Rule["condition"]) {
  const metric = (c.metric ?? "metric").toUpperCase();
  const op = c.op === "gt" ? ">" : c.op === "lt" ? "<" : c.op === "gte" ? "≥" : c.op ?? "?";
  const val = c.value != null ? String(c.value) : "—";
  const extra = c.minSpend != null ? ` · gasto > ${c.minSpend}` : "";
  return `${metric} ${op} ${val}${extra}`;
}

function formatAction(a: Rule["action"]) {
  if (a.type === "pause_campaign") return "Pausar campanha";
  if (a.type === "alert_only") return "Enviar alerta";
  return a.type ?? "—";
}

export function AutomationsClient() {
  const t = useTranslations("automations");
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "paused">("all");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMetric, setFormMetric] = useState<"cpl" | "spend" | "conversions">("cpl");
  const [formOp, setFormOp] = useState<"gt" | "lt" | "gte">("gt");
  const [formValue, setFormValue] = useState(50);
  const [formMinSpend, setFormMinSpend] = useState(30);
  const [formAction, setFormAction] = useState<"pause_campaign" | "alert_only">("pause_campaign");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    fetch("/api/automation/rules")
      .then((r) => r.json())
      .then((j) => {
        const list = (j.rules ?? []) as Rule[];
        setRules(list);
        setSelectedId((prev) => prev ?? list[0]?.id ?? null);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rules;
    if (tab === "active") list = list.filter((r) => r.enabled);
    if (tab === "paused") list = list.filter((r) => !r.enabled);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(needle));
    }
    return list;
  }, [rules, tab, q]);

  const stats = useMemo(
    () => ({
      active: rules.filter((r) => r.enabled).length,
      paused: rules.filter((r) => !r.enabled).length
    }),
    [rules]
  );

  const selected = rules.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  function applyTemplate(tpl: (typeof TEMPLATES)[number]) {
    setFormName(tpl.name);
    setFormMetric(tpl.condition.metric as "cpl" | "spend" | "conversions");
    setFormOp(tpl.condition.op as "gt" | "lt" | "gte");
    setFormValue(tpl.condition.value);
    setFormMinSpend("minSpend" in tpl.condition ? tpl.condition.minSpend ?? 0 : 0);
    setFormAction(tpl.action.type as "pause_campaign" | "alert_only");
    setShowForm(true);
  }

  function createRule() {
    startTransition(async () => {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formName.trim() || "Nova regra",
          condition: {
            metric: formMetric,
            op: formOp,
            value: formValue,
            minSpend: formMinSpend > 0 ? formMinSpend : undefined
          },
          action: { type: formAction }
        })
      });
      const j = await res.json();
      if (!res.ok) {
        setMessage(j.error ?? t("saveFailed"));
        return;
      }
      setMessage(t("saved"));
      setShowForm(false);
      load();
    });
  }

  function toggleRule(rule: Rule) {
    startTransition(async () => {
      await fetch(`/api/automation/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled })
      });
      load();
    });
  }

  function deleteRule(rule: Rule) {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      await fetch(`/api/automation/rules/${rule.id}`, { method: "DELETE" });
      load();
      setSelectedId(null);
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={t("breadcrumb")}
        actions={
          <button type="button" className="ui-btn-primary" onClick={() => setShowForm(true)}>
            {t("newRule")}
          </button>
        }
      />

      {message ? <p className="text-sm text-[var(--text-dim)]">{message}</p> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard label={t("kpiActive")} value={String(stats.active)} />
        <KpiCard label={t("kpiPaused")} value={String(stats.paused)} />
        <KpiCard label={t("kpiTotal")} value={String(rules.length)} />
      </div>

      {showForm ? (
        <div className="ui-card space-y-3 p-4">
          <div className="text-sm font-semibold">{t("formTitle")}</div>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="ui-btn-secondary !px-2 !py-1 text-xs"
              >
                {tpl.name}
              </button>
            ))}
          </div>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={t("ruleName")}
            className="ui-input w-full"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <select value={formMetric} onChange={(e) => setFormMetric(e.target.value as typeof formMetric)} className="ui-input">
              <option value="cpl">CPL</option>
              <option value="spend">Gasto</option>
              <option value="conversions">Conversões</option>
            </select>
            <select value={formOp} onChange={(e) => setFormOp(e.target.value as typeof formOp)} className="ui-input">
              <option value="gt">&gt;</option>
              <option value="gte">≥</option>
              <option value="lt">&lt;</option>
            </select>
            <input
              type="number"
              value={formValue}
              onChange={(e) => setFormValue(Number(e.target.value))}
              className="ui-input"
            />
            <input
              type="number"
              value={formMinSpend}
              onChange={(e) => setFormMinSpend(Number(e.target.value))}
              placeholder={t("minSpend")}
              className="ui-input"
            />
          </div>
          <select value={formAction} onChange={(e) => setFormAction(e.target.value as typeof formAction)} className="ui-input max-w-xs">
            <option value="pause_campaign">{t("actionPause")}</option>
            <option value="alert_only">{t("actionAlert")}</option>
          </select>
          <div className="flex gap-2">
            <button type="button" disabled={isPending} onClick={createRule} className="ui-btn-primary">
              {t("saveRule")}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="ui-btn-secondary">
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="ui-card p-4">
            <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-3">
              {(
                [
                  ["all", t("tabAll", { count: rules.length })],
                  ["active", t("tabActive", { count: stats.active })],
                  ["paused", t("tabPaused", { count: stats.paused })]
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    tab === key
                      ? "bg-[var(--amber-bright)] text-[#0f1419] shadow-sm"
                      : "text-[var(--text-dim)] hover:bg-[var(--surface-thead)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="ui-input mt-3 w-full"
            />
          </div>

          <div className="ui-card divide-y divide-[var(--border-color)] overflow-hidden">
            {filtered.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() => setSelectedId(rule.id)}
                className={`flex w-full flex-col gap-2 p-4 text-left transition hover:bg-[var(--row-hover)] ${
                  selected?.id === rule.id
                    ? "bg-[rgba(245,166,35,0.08)] ring-1 ring-inset ring-[rgba(245,166,35,0.25)]"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-[var(--text-main)]">{rule.name}</div>
                    <div className="mt-1 text-xs text-[var(--text-dimmer)]">{formatCondition(rule.condition)}</div>
                  </div>
                  <Badge variant={rule.enabled ? "success" : "neutral"}>
                    {rule.enabled ? t("statusActive") : t("statusPaused")}
                  </Badge>
                </div>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--text-dimmer)]">{t("empty")}</p>
            ) : null}
          </div>
        </div>

        <aside className="ui-card p-4">
          <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("detailTitle")}</h2>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-lg font-bold text-[var(--text-main)]">{selected.name}</div>
                <Badge variant={selected.enabled ? "success" : "neutral"}>
                  {selected.enabled ? t("statusActive") : t("statusPaused")}
                </Badge>
              </div>
              <p className="text-[var(--text-dim)]">{formatCondition(selected.condition)}</p>
              <p className="text-[var(--violet)]">{formatAction(selected.action)}</p>
              <div className="flex flex-col gap-2">
                <button type="button" className="ui-btn-secondary w-full" onClick={() => toggleRule(selected)}>
                  {selected.enabled ? t("pauseRule") : t("activateRule")}
                </button>
                <button
                  type="button"
                  className="ui-btn-secondary w-full text-red-600"
                  onClick={() => deleteRule(selected)}
                >
                  {t("deleteRule")}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[var(--text-dimmer)]">{t("selectRule")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
