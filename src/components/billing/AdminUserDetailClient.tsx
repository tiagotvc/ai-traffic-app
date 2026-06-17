"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AdminUserDetailSkeleton } from "@/components/billing/BillingSkeletons";
import {
  AddonStepperCard,
  AdminField,
  AdminIcon,
  AdminInput,
  AdminSaveButton,
  AdminSection,
  AdminSelect,
  AdminTextarea,
  PlanBadge,
  StatusBadge,
  UserAvatar,
  type AddonKey
} from "@/components/billing/AdminUserUi";
import type { PlanLimits } from "@/lib/billing/types";

type UserDetail = {
  user: {
    id: string;
    email: string;
    name: string | null;
    platformRole: "user" | "admin";
    facebookId: string | null;
    googleId: string | null;
    tenantId: string;
    createdAt: string;
  };
  tenant: {
    id: string;
    name: string;
    brandName: string | null;
  };
  subscription: {
    status: string;
    billingCycle: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    plan: { id: string; slug: string; name: string } | null;
  };
  addons: {
    extraClients: number;
    extraAdAccounts: number;
    extraMembers: number;
    extraAutomationRules: number;
    extraAiRequestsPerMonth: number;
    extraScheduledReports: number;
    adminNote: string | null;
  };
  limits: { base: PlanLimits; effective: PlanLimits };
  usage: {
    clients: number;
    adAccounts: number;
    members: number;
    automationRules: number;
    aiRequestsThisMonth: number;
    scheduledReports: number;
  };
  members: Array<{
    id: string;
    email: string;
    name: string | null;
    platformRole: string;
    role: string;
  }>;
  plans: Array<{ id: string; slug: string; name: string; isActive: boolean }>;
};

const ADDON_FIELDS: Array<{ key: AddonKey; labelKey: string; limitKey: keyof PlanLimits }> = [
  { key: "extraClients", labelKey: "limitClients", limitKey: "maxClients" },
  { key: "extraAdAccounts", labelKey: "limitAdAccounts", limitKey: "maxAdAccounts" },
  { key: "extraMembers", labelKey: "limitMembers", limitKey: "maxMembers" },
  { key: "extraAutomationRules", labelKey: "limitAutomations", limitKey: "maxAutomationRules" },
  { key: "extraAiRequestsPerMonth", labelKey: "limitAi", limitKey: "maxAiRequestsPerMonth" },
  { key: "extraScheduledReports", labelKey: "limitReports", limitKey: "maxScheduledReports" }
];

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const over = used > max;
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
      <div className="mb-2 flex justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={over ? "font-bold text-red-600" : "tabular-nums text-slate-500"}>
          {used} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-violet-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AdminUserDetailClient({ userId }: { userId: string }) {
  const t = useTranslations("billingAdmin");
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [platformRole, setPlatformRole] = useState<"user" | "admin">("user");
  const [tenantName, setTenantName] = useState("");
  const [tenantBrand, setTenantBrand] = useState("");
  const [planSlug, setPlanSlug] = useState("");
  const [subStatus, setSubStatus] = useState("");
  const [billingCycle, setBillingCycle] = useState("yearly");
  const [periodEnd, setPeriodEnd] = useState("");
  const [addons, setAddons] = useState<UserDetail["addons"] | null>(null);
  const [addonNote, setAddonNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setName(json.user.name ?? "");
        setEmail(json.user.email);
        setPlatformRole(json.user.platformRole);
        setTenantName(json.tenant.name);
        setTenantBrand(json.tenant.brandName ?? "");
        setPlanSlug(json.subscription.plan?.slug ?? "free");
        setSubStatus(json.subscription.status);
        setBillingCycle(json.subscription.billingCycle);
        setPeriodEnd(
          json.subscription.currentPeriodEnd
            ? json.subscription.currentPeriodEnd.slice(0, 10)
            : ""
        );
        setAddons(json.addons);
        setAddonNote(json.addons.adminNote ?? "");
      } else {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSection(key: string, fn: () => Promise<Response>) {
    setSaving(key);
    setMessage(null);
    try {
      const res = await fn();
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? t("saveError"));
      setMessage({ type: "ok", text: t("saved") });
      await load();
    } catch (err) {
      setMessage({
        type: "err",
        text: err instanceof Error ? err.message : t("saveError")
      });
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <AdminUserDetailSkeleton />;
  }

  if (!data) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-slate-500">{t("usersNotFound")}</p>
        <Link href="/admin/users" className="text-sm font-semibold text-violet-600">
          {t("usersBack")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
          >
            <span className="rotate-180">
              <AdminIcon name="chevron" className="h-3.5 w-3.5" />
            </span>
            {t("usersBack")}
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <UserAvatar name={data.user.name} email={data.user.email} size="md" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {data.user.name || data.user.email}
              </h1>
              <p className="truncate text-xs text-slate-500">{data.user.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <PlanBadge
                  slug={data.subscription.plan?.slug ?? "free"}
                  name={data.subscription.plan?.name ?? "Free"}
                />
                <StatusBadge status={data.subscription.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection title={t("usersSectionProfile")} icon="user" accent="violet">
          <div className="space-y-4">
            <AdminField label={t("fieldName")} icon="user">
              <AdminInput icon value={name} onChange={(e) => setName(e.target.value)} />
            </AdminField>
            <AdminField label="Email" icon="email">
              <AdminInput icon type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </AdminField>
            <AdminField label={t("usersPlatformRole")} icon="shield">
              <AdminSelect
                icon
                value={platformRole}
                onChange={(e) => setPlatformRole(e.target.value as "user" | "admin")}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </AdminSelect>
            </AdminField>
            {data.user.facebookId ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Facebook ID: <span className="font-mono">{data.user.facebookId}</span>
              </p>
            ) : null}
            {data.user.googleId ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Google ID: <span className="font-mono">{data.user.googleId}</span>
              </p>
            ) : null}
            <AdminSaveButton
              loading={saving === "profile"}
              loadingLabel={t("saving")}
              label={t("savePlan")}
              onClick={() =>
                saveSection("profile", () =>
                  fetch(`/api/admin/users/${userId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: name || null, email, platformRole })
                  })
                )
              }
            />
          </div>
        </AdminSection>

        <AdminSection title={t("usersSectionWorkspace")} icon="building" accent="slate">
          <div className="space-y-4">
            <AdminField label={t("usersWorkspaceName")} icon="building">
              <AdminInput icon value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
            </AdminField>
            <AdminField label={t("usersWorkspaceBrand")} icon="tag">
              <AdminInput icon value={tenantBrand} onChange={(e) => setTenantBrand(e.target.value)} />
            </AdminField>
            <AdminSaveButton
              loading={saving === "tenant"}
              loadingLabel={t("saving")}
              label={t("savePlan")}
              onClick={() =>
                saveSection("tenant", () =>
                  fetch(`/api/admin/tenants/${data.tenant.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: tenantName,
                      brandName: tenantBrand || null
                    })
                  })
                )
              }
            />
          </div>
        </AdminSection>

        <AdminSection
          title={t("usersSectionPlan")}
          icon="plan"
          accent="violet"
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label={t("usersPlanSelect")} icon="plan">
              <AdminSelect icon value={planSlug} onChange={(e) => setPlanSlug(e.target.value)}>
                {data.plans.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} {!p.isActive ? `(${t("inactive")})` : ""}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label={t("colStatus")}>
              <AdminSelect value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>
                {["active", "trialing", "past_due", "suspended", "canceled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label={t("usersBillingCycle")} icon="cycle">
              <AdminSelect icon value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
              </AdminSelect>
            </AdminField>
            <AdminField label={t("usersPeriodEnd")} icon="calendar">
              <AdminInput
                icon
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </AdminField>
          </div>
          <div className="mt-5">
            <AdminSaveButton
              loading={saving === "subscription"}
              loadingLabel={t("saving")}
              label={t("usersSaveSubscription")}
              onClick={() =>
                saveSection("subscription", () =>
                  fetch(`/api/admin/tenants/${data.tenant.id}/subscription`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      planSlug,
                      status: subStatus,
                      billingCycle,
                      currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null
                    })
                  })
                )
              }
            />
          </div>
        </AdminSection>

        <AdminSection
          title={t("usersSectionAddons")}
          subtitle={t("usersAddonsHint")}
          icon="ai"
          accent="amber"
          className="lg:col-span-2"
        >
          {addons ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {ADDON_FIELDS.map(({ key, labelKey, limitKey }) => (
                  <AddonStepperCard
                    key={key}
                    addonKey={key}
                    label={t(labelKey)}
                    value={addons[key]}
                    baseLimit={data.limits.base[limitKey] as number}
                    planLabel={t("usersPlanSelect")}
                    extraLabel={t("usersAddonExtra")}
                    onChange={(v) => setAddons((prev) => (prev ? { ...prev, [key]: v } : prev))}
                  />
                ))}
              </div>
              <div className="mt-5">
                <AdminField label={t("usersAddonNote")} icon="note">
                  <AdminTextarea
                    value={addonNote}
                    onChange={(e) => setAddonNote(e.target.value)}
                    placeholder={t("usersAddonNote")}
                  />
                </AdminField>
              </div>
              <div className="mt-4">
                <AdminSaveButton
                  variant="amber"
                  loading={saving === "addons"}
                  loadingLabel={t("saving")}
                  label={t("usersSaveAddons")}
                  onClick={() =>
                    saveSection("addons", () =>
                      fetch(`/api/admin/tenants/${data.tenant.id}/addons`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...addons, adminNote: addonNote || null })
                      })
                    )
                  }
                />
              </div>
            </>
          ) : null}
        </AdminSection>

        <AdminSection
          title={t("usersSectionUsage")}
          icon="reports"
          accent="emerald"
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageBar
              label={t("limitClients")}
              used={data.usage.clients}
              max={data.limits.effective.maxClients}
            />
            <UsageBar
              label={t("limitAdAccounts")}
              used={data.usage.adAccounts}
              max={data.limits.effective.maxAdAccounts}
            />
            <UsageBar
              label={t("limitMembers")}
              used={data.usage.members}
              max={data.limits.effective.maxMembers}
            />
            <UsageBar
              label={t("limitAi")}
              used={data.usage.aiRequestsThisMonth}
              max={data.limits.effective.maxAiRequestsPerMonth}
            />
          </div>
        </AdminSection>

        {data.members.length > 1 ? (
          <AdminSection
            title={t("usersSectionMembers")}
            icon="members"
            accent="slate"
            className="lg:col-span-2"
          >
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/40">
              {data.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={m.name} email={m.email} size="sm" />
                    <div>
                      <p className="font-medium text-slate-900">{m.name || m.email}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {m.role}
                    </span>
                    {m.id !== userId ? (
                      <Link
                        href={`/admin/users/${m.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
                      >
                        {t("usersManage")}
                        <AdminIcon name="chevron" className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">atual</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </AdminSection>
        ) : null}
      </div>
    </div>
  );
}
