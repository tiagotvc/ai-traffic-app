"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AdminPlansSkeleton } from "@/components/billing/BillingSkeletons";
import { CompactPageHeader } from "@/components/layout/CompactPageHeader";
import { adminPlanRowStyle } from "@/lib/billing/admin-plan-styles";
import { resolveLimits } from "@/lib/billing/resolve-limits";
import { FREE_LIMITS, type ExternalPrices, type PlanLimits } from "@/lib/billing/types";

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
  const resolvedLimits = resolveLimits({ limits: plan.limits });
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
    limits: { ...resolvedLimits }
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
      <label className="flex items-center gap-2 text-sm text-slate-800">
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
              <span className="mb-1 block font-medium text-slate-700">{label}</span>
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

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
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
  const [open, setOpen] = useState(false);
  const style = adminPlanRowStyle(plan.slug, draft.isActive);

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
      window.dispatchEvent(new Event("traffic:entitlements-changed"));
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
    <div className={`overflow-hidden rounded-xl border ${style.card}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${style.header}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={`h-8 w-1 shrink-0 rounded-full ${style.accent}`} aria-hidden />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-base font-bold ${style.title}`}>{plan.name}</span>
              {!draft.isActive ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${style.inactiveBadge}`}
                >
                  {t("inactive")}
                </span>
              ) : null}
            </div>
            {!open && plan.description ? (
              <p className={`mt-0.5 truncate text-sm ${style.meta}`}>{plan.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {!open ? (
            <span className={`text-sm font-semibold tabular-nums ${style.price}`}>
              {formatUsd(plan.priceMonthlyCents)}
              <span className="font-normal opacity-80">/mês</span>
            </span>
          ) : null}
          <span className={`text-sm ${style.chevron}`}>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open ? (
        <div className={`space-y-4 border-t px-4 py-4 ${style.body}`}>
          <p className="font-mono text-xs text-slate-400">
            {t("fieldSlug")}: {plan.slug}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">{t("fieldName")}</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">{t("fieldDescription")}</span>
              <textarea
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                className="ui-input min-h-[72px] w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{t("fieldTrialDays")}</span>
              <input
                type="number"
                min={0}
                value={draft.trialDays}
                onChange={(e) => setDraft((d) => ({ ...d, trialDays: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">{t("fieldSortOrder")}</span>
              <input
                type="number"
                min={0}
                value={draft.sortOrder}
                onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                className="ui-input w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-800 sm:col-span-2">
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
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
              {t("sectionPricesUsd")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{t("fieldPriceMonthly")} (USD)</span>
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
                <span className="mb-1 block font-medium text-slate-700">{t("fieldPriceYearly")} (USD)</span>
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
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
              {t("sectionPricesBrl")}
            </h3>
            <p className="mb-3 text-xs text-slate-600">{t("sectionPricesBrlHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">{t("fieldPriceMonthly")} (BRL)</span>
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
                <span className="mb-1 block font-medium text-slate-700">{t("fieldPriceYearly")} (BRL)</span>
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
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">
              {t("sectionLimits")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

          <div>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
              {t("sectionNav")}
            </h3>
            <p className="mb-3 text-xs text-slate-500">{t("sectionNavHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <LimitField
                label={t("limitNavCampaigns")}
                value={draft.limits.allowNavCampaigns}
                onChange={(v) => setLimit("allowNavCampaigns", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitNavAudiences")}
                value={draft.limits.allowNavAudiences}
                onChange={(v) => setLimit("allowNavAudiences", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitNavCreatives")}
                value={draft.limits.allowNavCreatives}
                onChange={(v) => setLimit("allowNavCreatives", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitNavReports")}
                value={draft.limits.allowNavReports}
                onChange={(v) => setLimit("allowNavReports", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitNavAlerts")}
                value={draft.limits.allowNavAlerts}
                onChange={(v) => setLimit("allowNavAlerts", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitNavAutomations")}
                value={draft.limits.allowNavAutomations}
                onChange={(v) => setLimit("allowNavAutomations", v as boolean)}
                type="checkbox"
              />
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-700">
              {t("sectionAgencyBrain")}
            </h3>
            <p className="mb-3 text-xs text-slate-500">{t("sectionAgencyBrainHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <LimitField
                label={t("limitCreativeMemoryAi")}
                value={draft.limits.allowCreativeMemoryAi}
                onChange={(v) => setLimit("allowCreativeMemoryAi", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainHypotheses")}
                value={draft.limits.allowAgencyBrainHypotheses}
                onChange={(v) => setLimit("allowAgencyBrainHypotheses", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainDna")}
                value={draft.limits.allowAgencyBrainDna}
                onChange={(v) => setLimit("allowAgencyBrainDna", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainTimeline")}
                value={draft.limits.allowAgencyBrainTimeline}
                onChange={(v) => setLimit("allowAgencyBrainTimeline", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainExperiments")}
                value={draft.limits.allowAgencyBrainExperiments}
                onChange={(v) => setLimit("allowAgencyBrainExperiments", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainActionPlans")}
                value={draft.limits.allowAgencyBrainActionPlans}
                onChange={(v) => setLimit("allowAgencyBrainActionPlans", v as boolean)}
                type="checkbox"
              />
              <LimitField
                label={t("limitAgencyBrainChat")}
                value={draft.limits.allowAgencyBrainChat}
                onChange={(v) => setLimit("allowAgencyBrainChat", v as boolean)}
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

function CreatePlanForm({ onCreated }: { onCreated: (plan: AdminPlan) => void }) {
  const t = useTranslations("billingAdmin");
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/billing/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          description: description.trim() || null,
          limits: FREE_LIMITS
        })
      });
      const j = await res.json();
      if (!j.ok) {
        setMessage(j.error ?? t("createPlanError"));
        return;
      }
      onCreated(j.plan as AdminPlan);
      setSlug("");
      setName("");
      setDescription("");
      setOpen(false);
      setMessage(t("createPlanSuccess"));
    } catch {
      setMessage(t("createPlanError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2.5 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-base font-bold text-white">
            +
          </span>
          <div>
            <p className="font-semibold text-slate-900">{t("createPlanTitle")}</p>
            <p className="text-xs text-slate-500">{t("createPlanHint")}</p>
          </div>
        </div>
        <span className="text-sm text-violet-600">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <form onSubmit={submit} className="space-y-3 border-t border-violet-200/60 px-4 pb-4 pt-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t("fieldSlug")}</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="meu-plano"
                required
                className="ui-input w-full font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t("fieldName")}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="ui-input w-full"
              />
            </label>
            <label className="block text-sm sm:col-span-2 lg:col-span-1">
              <span className="mb-1 block text-slate-600">{t("fieldDescription")}</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="ui-input w-full"
              />
            </label>
          </div>
          <p className="text-xs text-slate-500">{t("createPlanDefaults")}</p>
          {message ? (
            <p className={`text-sm ${message === t("createPlanSuccess") ? "text-emerald-600" : "text-red-600"}`}>
              {message}
            </p>
          ) : null}
          <button type="submit" disabled={creating} className="ui-btn-primary text-sm">
            {creating ? t("creatingPlan") : t("createPlanBtn")}
          </button>
        </form>
      ) : message && message === t("createPlanSuccess") ? (
        <p className="border-t border-violet-200/60 px-5 py-3 text-sm text-emerald-600">{message}</p>
      ) : null}
    </div>
  );
}

export function AdminPlansClient({ initialPlans }: { initialPlans?: AdminPlan[] }) {
  const t = useTranslations("billingAdmin");
  const hasInitial = initialPlans !== undefined;
  const [plans, setPlans] = useState<AdminPlan[]>(initialPlans ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!hasInitial);

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
    if (!hasInitial) load();
  }, [hasInitial, load]);

  if (loading && plans.length === 0) {
    return <AdminPlansSkeleton />;
  }

  return (
    <div className="w-full space-y-4">
      <CompactPageHeader title={t("plansTitle")} subtitle={t("plansSubtitle")} />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error === "Forbidden" ? (
            <p className="mt-1 text-xs">{t("forbiddenHint")}</p>
          ) : null}
        </div>
      ) : null}

      <CreatePlanForm
        onCreated={(plan) => {
          setPlans((prev) => [...prev, plan].sort((a, b) => a.sortOrder - b.sortOrder));
        }}
      />

      {loading ? (
        <div className="space-y-4 opacity-60">
          {plans.map((plan) => (
            <PlanEditor
              key={plan.id}
              plan={plan}
              onSaved={(updated) => setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
            />
          ))}
        </div>
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
