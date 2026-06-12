"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AdminBillingNav } from "@/components/billing/AdminBillingNav";
import type { ExternalPrices, PlanLimits } from "@/lib/billing/types";

type AdminPlan = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  trialDays: number;
  sortOrder: number;
  isActive: boolean;
  limits: PlanLimits;
  externalPrices?: ExternalPrices | null;
};

type PlanDraft = {
  name: string;
  description: string;
  priceMonthlyUsd: string;
  priceYearlyUsd: string;
  priceMonthlyBrl: string;
  priceYearlyBrl: string;
  trialDays: string;
  sortOrder: string;
  isActive: boolean;
  limits: PlanLimits;
};

function centsToInput(cents: number): string {
  if (cents === 0) return "0";
  const v = cents / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function inputToCents(raw: string): number {
  const n = parseFloat(raw.replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function planToDraft(plan: AdminPlan): PlanDraft {
  const brl = plan.externalPrices?.asaas;
  return {
    name: plan.name,
    description: plan.description ?? "",
    priceMonthlyUsd: centsToInput(plan.priceMonthlyCents),
    priceYearlyUsd: centsToInput(plan.priceYearlyCents),
    priceMonthlyBrl: centsToInput(brl?.monthlyCents ?? plan.priceMonthlyCents),
    priceYearlyBrl: centsToInput(brl?.yearlyCents ?? plan.priceYearlyCents),
    trialDays: String(plan.trialDays),
    sortOrder: String(plan.sortOrder),
    isActive: plan.isActive,
    limits: { ...plan.limits }
  };
}

function LimitField({
  label,
  value,
  onChange,
  type = "number"
}: {
  label: string;
  value: number | boolean;
  onChange: (v: number | boolean) => void;
  type?: "number" | "checkbox";
}) {
  if (type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-slate-300"
        />
        {label}
      </label>
    );
  }
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <input
        type="number"
        min={0}
        value={value as number}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="ui-input w-full"
      />
    </label>
  );
}

function PlanEditor({
  plan,
  onSaved
}: {
  plan: AdminPlan;
  onSaved: (updated: AdminPlan) => void;
}) {
  const t = useTranslations("billingAdmin");
  const [draft, setDraft] = useState<PlanDraft>(() => planToDraft(plan));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [open, setOpen] = useState(plan.slug !== "free");

  useEffect(() => {
    setDraft(planToDraft(plan));
  }, [plan]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const monthlyBrl = inputToCents(draft.priceMonthlyBrl);
      const yearlyBrl = inputToCents(draft.priceYearlyBrl);
      const res = await fetch(`/api/admin/billing/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || null,
          priceMonthlyCents: inputToCents(draft.priceMonthlyUsd),
          priceYearlyCents: inputToCents(draft.priceYearlyUsd),
          trialDays: parseInt(draft.trialDays, 10) || 0,
          sortOrder: parseInt(draft.sortOrder, 10) || 0,
          isActive: draft.isActive,
          limits: draft.limits,
          externalPrices: {
            ...(plan.externalPrices ?? {}),
            asaas: { monthlyCents: monthlyBrl, yearlyCents: yearlyBrl }
          }
        })
      });
      const j = await res.json();
      if (!j.ok) {
        setMessage({ type: "err", text: j.error ?? t("saveError") });
        return;
      }
      onSaved(j.plan as AdminPlan);
      setMessage({ type: "ok", text: t("saved") });
    } catch {
      setMessage({ type: "err", text: t("saveError") });
    } finally {
      setSaving(false);
    }
  }

  const setLimit = (key: keyof PlanLimits, val: number | boolean) => {
    setDraft((d) => ({ ...d, limits: { ...d.limits, [key]: val } }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50/80"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400">{plan.slug}</span>
          <span className="text-lg font-bold text-slate-900">{plan.name}</span>
          {!draft.isActive ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {t("inactive")}
            </span>
          ) : null}
        </div>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="space-y-6 border-t border-slate-100 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-600">{t("fieldName")}</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-slate-600">{t("fieldDescription")}</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="ui-input min-h-[72px] w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t("fieldTrialDays")}</span>
              <input
                type="number"
                min={0}
                value={draft.trialDays}
                onChange={(e) => setDraft((d) => ({ ...d, trialDays: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t("fieldSortOrder")}</span>
              <input
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                className="rounded border-slate-300"
              />
              {t("fieldActive")}
            </label>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {t("sectionPricesUsd")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">{t("fieldPriceMonthly")} (USD)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    value={draft.priceMonthlyUsd}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMonthlyUsd: e.target.value }))}
                    className="ui-input w-full pl-7"
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">{t("fieldPriceYearly")} (USD)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    value={draft.priceYearlyUsd}
                    onChange={(e) => setDraft((d) => ({ ...d, priceYearlyUsd: e.target.value }))}
                    className="ui-input w-full pl-7"
                  />
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {t("sectionPricesBrl")}
            </h3>
            <p className="mb-3 text-xs text-slate-500">{t("sectionPricesBrlHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">{t("fieldPriceMonthly")} (BRL)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input
                    value={draft.priceMonthlyBrl}
                    onChange={(e) => setDraft((d) => ({ ...d, priceMonthlyBrl: e.target.value }))}
                    className="ui-input w-full pl-9"
                  />
                </div>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">{t("fieldPriceYearly")} (BRL)</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input
                    value={draft.priceYearlyBrl}
                    onChange={(e) => setDraft((d) => ({ ...d, priceYearlyBrl: e.target.value }))}
                    className="ui-input w-full pl-9"
                  />
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {t("sectionLimits")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <LimitField
                label={t("limitClients")}
                value={draft.limits.maxClients}
                onChange={(v) => setLimit("maxClients", v as number)}
              />
              <LimitField
                label={t("limitAdAccounts")}
                value={draft.limits.maxAdAccounts}
                onChange={(v) => setLimit("maxAdAccounts", v as number)}
              />
              <LimitField
                label={t("limitMembers")}
                value={draft.limits.maxMembers}
                onChange={(v) => setLimit("maxMembers", v as number)}
              />
              <LimitField
                label={t("limitAutomations")}
                value={draft.limits.maxAutomationRules}
                onChange={(v) => setLimit("maxAutomationRules", v as number)}
              />
              <LimitField
                label={t("limitAi")}
                value={draft.limits.maxAiRequestsPerMonth}
                onChange={(v) => setLimit("maxAiRequestsPerMonth", v as number)}
              />
              <LimitField
                label={t("limitReports")}
                value={draft.limits.maxScheduledReports}
                onChange={(v) => setLimit("maxScheduledReports", v as number)}
              />
              <LimitField
                label={t("limitAutoSync")}
                value={draft.limits.allowAutoSync}
                onChange={(v) => setLimit("allowAutoSync", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitLiveMeta")}
                value={draft.limits.allowLiveMeta}
                onChange={(v) => setLimit("allowLiveMeta", v as boolean)}
                type="checkbox"
              />
            </div>
          </div>

          {message ? (
            <p className={`text-sm ${message.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {message.text}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="ui-btn-primary text-sm">
              {saving ? t("saving") : t("savePlan")}
            </button>
            <button
              type="button"
              onClick={() => setDraft(planToDraft(plan))}
              className="ui-btn-secondary text-sm"
            >
              {t("reset")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminPlansClient() {
  const t = useTranslations("billingAdmin");
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) setError(j.error);
        else {
          setError(null);
          setPlans(j.plans ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminBillingNav />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("plansTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("plansSubtitle")}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error === "Forbidden" ? (
            <p className="mt-1 text-xs">{t("forbiddenHint")}</p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">{t("loading")}</p>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanEditor
              key={plan.id}
              plan={plan}
              onSaved={(updated) => setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
