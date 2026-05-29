"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        breadcrumbs={t("breadcrumb")}
        actions={
          <>
            <button type="button" className="ui-btn-secondary">
              {t("executionLogs")}
            </button>
            <button type="button" className="ui-btn-primary">
              {t("newRule")}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label={t("kpiActive")} value={String(stats.active)} />
        <KpiCard label={t("kpiPaused")} value={String(stats.paused)} />
        <KpiCard label={t("kpiTotal")} value={String(rules.length)} />
        <KpiCard label={t("kpiToday")} value="—" />
        <KpiCard label={t("kpiActions")} value="—" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="ui-card p-4">
            <div className="flex flex-wrap gap-2 border-b border-surface-line pb-3">
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
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === key ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
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

          <div className="ui-card divide-y divide-surface-line overflow-hidden">
            {filtered.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() => setSelectedId(rule.id)}
                className={`flex w-full flex-col gap-2 p-4 text-left transition hover:bg-slate-50 ${
                  selected?.id === rule.id ? "bg-violet-50/80 ring-1 ring-inset ring-violet-200" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{rule.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatCondition(rule.condition)}</div>
                  </div>
                  <Badge variant={rule.enabled ? "success" : "neutral"}>
                    {rule.enabled ? t("statusActive") : t("statusPaused")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                    {formatCondition(rule.condition)}
                  </span>
                  <span className="rounded-lg bg-violet-50 px-2 py-1 text-[11px] text-violet-700">
                    {formatAction(rule.action)}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">{t("empty")}</p>
            ) : null}
          </div>
        </div>

        <aside className="ui-card p-4">
          <h2 className="text-sm font-semibold text-slate-900">{t("detailTitle")}</h2>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-lg font-bold text-slate-900">{selected.name}</div>
                <Badge variant={selected.enabled ? "success" : "neutral"}>
                  {selected.enabled ? t("statusActive") : t("statusPaused")}
                </Badge>
              </div>
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("sectionCondition")}
                </div>
                <p className="mt-1 text-slate-700">{formatCondition(selected.condition)}</p>
              </section>
              <section>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t("sectionAction")}
                </div>
                <p className="mt-1 text-slate-700">{formatAction(selected.action)}</p>
              </section>
              <button type="button" className="ui-btn-secondary w-full">
                {selected.enabled ? t("pauseRule") : t("activateRule")}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">{t("selectRule")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
