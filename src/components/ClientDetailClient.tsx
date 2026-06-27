"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { DsPageHeader } from "@/design-system";
import { ClientMetaExtras } from "@/components/ClientMetaExtras";
import { ClientReadinessChecklist } from "@/components/ClientReadinessChecklist";
import { ClientSyncBanner } from "@/components/ClientSyncBanner";
import { ClientDetailTabs } from "@/components/client/ClientDetailTabs";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { UxFormCard } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { Link, useRouter } from "@/i18n/navigation";
import { CLIENT_NICHE_OPTIONS } from "@/lib/client-niches";
import { formatBRL, formatRoas } from "@/lib/format";

type Goals = {
  objective?: string;
  maxCpl?: number | null;
  maxCpa?: number | null;
  maxCpc?: number | null;
  minCtr?: number | null;
  minRoas?: number | null;
  maxSpendWithoutConversion?: number | null;
  budgetAlertPercent?: number | null;
  windowDays?: number;
  enabled?: boolean;
};

type ClientData = {
  id: string;
  slug: string;
  name: string;
  aiContext: unknown;
  niche: string | null;
  kpis: { spend: number; conversions: number; cpa: number; cpl?: number; roas: number };
  accounts: Array<{ id: string; metaAdAccountId: string; label: string }>;
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    roas: string;
    spend: string;
    hasAlert?: boolean;
    cpl?: number | null;
  }>;
};

type AccountOption = {
  metaAdAccountId: string;
  label: string;
  metaBusinessId?: string | null;
  metaBusinessName?: string | null;
};

type BusinessOption = {
  metaBusinessId: string;
  name: string;
  adAccountCount: number;
  pageCount: number;
};

type Feedback = { type: "success" | "error"; text: string };

const ONBOARDING_KEY = "traffic-ai-client-onboarding-dismissed";

function isProtectedClient(name: string, slug: string) {
  return name === "Default" || slug === "default";
}

export function ClientDetailClient({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<ClientData | null>(null);
  const [goals, setGoals] = useState<Goals>({ enabled: true, windowDays: 1, objective: "leads" });
  const [availableAccounts, setAvailableAccounts] = useState<AccountOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [clientMetaBusinessId, setClientMetaBusinessId] = useState<string>("");
  const [bmFilter, setBmFilter] = useState<string>("");
  const [linkedMetaIds, setLinkedMetaIds] = useState<string[]>([]);
  const [metaPageId, setMetaPageId] = useState("");
  const [availablePages, setAvailablePages] = useState<
    Array<{ id: string; name: string; metaBusinessId?: string | null }>
  >([]);
  const [publishReady, setPublishReady] = useState(false);
  const [clientNiche, setClientNiche] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isPending, startTransition] = useTransition();

  const notify = useCallback((type: Feedback["type"], text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 6000);
  }, []);

  const handleDeleteClient = useCallback(() => {
    if (!data) return;
    if (isProtectedClient(data.name, data.slug)) {
      notify("error", t("cannotDeleteDefault"));
      return;
    }
    if (!window.confirm(t("deleteConfirm", { name: data.name }))) return;
    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        notify("error", String(j.error ?? t("deleteFailed")));
        return;
      }
      window.dispatchEvent(new Event("traffic:campaigns-reload"));
      router.push("/clients");
    });
  }, [clientId, data, notify, router, t]);

  useEffect(() => {
    try {
      setShowOnboarding(localStorage.getItem(ONBOARDING_KEY) !== "1");
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  const reload = useCallback(() => {
    fetch(`/api/clients/${encodeURIComponent(clientId)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok || !j.client) {
          notify("error", j.error ?? t("loadError"));
          return;
        }
        setData(j.client);
        setClientNiche(j.client.niche ?? "");
      })
      .catch(() => notify("error", t("loadError")));
  }, [clientId, t, notify]);

  useEffect(() => {
    reload();
    fetch(`/api/clients/${encodeURIComponent(clientId)}/goals`)
      .then((r) => r.json())
      .then((j) => {
        if (j.goals) setGoals({ ...j.goals, objective: j.objective ?? "leads" });
      });
    fetch(`/api/clients/${encodeURIComponent(clientId)}/ad-accounts`)
      .then((r) => r.json())
      .then((j) => {
        setAvailableAccounts(j.available ?? []);
        setBusinesses(j.businesses ?? []);
        setLinkedMetaIds(j.linkedMetaIds ?? []);
        const bm = (j.clientMetaBusinessId as string | null) ?? "";
        setClientMetaBusinessId(bm);
        setBmFilter(bm);
      });
    fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`)
      .then((r) => r.json())
      .then((j) => {
        if (j.client) {
          setMetaPageId(j.client.metaPageId ?? "");
        }
        setAvailablePages(j.availablePages ?? []);
        setPublishReady(!!j.publish?.ready);
      });
  }, [clientId, reload]);

  const effectiveBm = bmFilter || clientMetaBusinessId;
  const filteredAccounts = effectiveBm
    ? availableAccounts.filter((a) =>
        effectiveBm === "unassigned" ? !a.metaBusinessId : a.metaBusinessId === effectiveBm
      )
    : availableAccounts;

  const filteredPages = effectiveBm
    ? availablePages.filter((p) =>
        !p.metaBusinessId ||
        (effectiveBm === "unassigned" ? !p.metaBusinessId : p.metaBusinessId === effectiveBm)
      )
    : availablePages;

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg" style={{ background: "var(--surface-card)" }} />
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DsPageHeader
        breadcrumbs={
          <Link href="/clients" className="ui-link text-xs">
            ← Clientes
          </Link>
        }
        title={data.name}
      />
      <ClientDetailTabs clientSlug={clientId} activeTab="settings" />

    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {feedback ? (
        <div
          className={`lg:col-span-3 ${
            feedback.type === "success" ? "ui-alert-success" : "ui-alert-danger"
          } text-sm`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="lg:col-span-2 space-y-3">
        {showOnboarding ? (
          <div className="ui-card ui-alert-info p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text-main)]">{t("onboardingTitle")}</div>
                <p className="mt-2 text-xs text-[var(--text-dim)]">{t("onboardingIntro")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--text-dim)]">
                  <li>{t("onboardingClient")}</li>
                  <li>{t("onboardingAdAccount")}</li>
                  <li>{t("onboardingCampaign")}</li>
                </ul>
                <p className="mt-3 text-xs font-medium text-[var(--violet)]">{t("onboardingSteps")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowOnboarding(false);
                  try {
                    localStorage.setItem(ONBOARDING_KEY, "1");
                  } catch {
                    /* ignore */
                  }
                }}
                className="ui-btn-secondary shrink-0 px-2 py-1 text-[11px]"
              >
                {t("onboardingDismiss")}
              </button>
            </div>
          </div>
        ) : null}

        <ClientReadinessChecklist clientId={clientId} />
        <ClientSyncBanner clientId={clientId} />

        <div className="ui-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{data.name}</div>
              <div className="mt-1 text-xs text-[var(--text-dim)]">{t("active")}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/campaigns?client=${encodeURIComponent(data.slug)}`}
                className="rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {t("viewCampaigns")}
              </Link>
              {!isProtectedClient(data.name, data.slug) ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleDeleteClient}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-60"
                  style={{ borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}
                >
                  {t("deleteClient")}
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={t("spend")} value={formatBRL(data.kpis.spend, locale)} />
            <Kpi label={t("conversions")} value={String(Math.round(data.kpis.conversions))} />
            <Kpi label={t("cpa")} value={formatBRL(data.kpis.cpa, locale)} />
            <Kpi label="ROAS" value={formatRoas(data.kpis.roas, locale)} />
          </div>
        </div>

        <UxFormCard>
          <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{t("goalsTitle")}</div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{t("goalsHint")}</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <GoalField label={t("maxCpl")} value={goals.maxCpl} onChange={(v) => setGoals((g) => ({ ...g, maxCpl: v }))} />
            <GoalField label={t("maxCpa")} value={goals.maxCpa} onChange={(v) => setGoals((g) => ({ ...g, maxCpa: v }))} />
            <GoalField label={t("maxCpc")} value={goals.maxCpc} onChange={(v) => setGoals((g) => ({ ...g, maxCpc: v }))} />
            <GoalField label={t("minCtr")} value={goals.minCtr} onChange={(v) => setGoals((g) => ({ ...g, minCtr: v }))} />
            <GoalField label={t("minRoas")} value={goals.minRoas} onChange={(v) => setGoals((g) => ({ ...g, minRoas: v }))} />
            <GoalField
              label={t("maxSpendNoConv")}
              value={goals.maxSpendWithoutConversion}
              onChange={(v) => setGoals((g) => ({ ...g, maxSpendWithoutConversion: v }))}
            />
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={goals.enabled ?? true}
              onChange={(e) => setGoals((g) => ({ ...g, enabled: e.target.checked }))}
              className="accent-violet-600"
            />
            {t("goalsEnabled")}
          </label>
          <div className="mt-3 flex justify-end">
            <UxSaveButton
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/goals`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(goals)
                  });
                  const j = await res.json();
                  notify(j.ok ? "success" : "error", j.ok ? t("goalsSaved") : j.error ?? t("loadError"));
                });
              }}
              label={t("saveGoals")}
            />
          </div>
        </UxFormCard>

        <UxFormCard>
          <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{t("publishTitle")}</div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{t("publishHint")}</div>
          {!publishReady ? (
            <div className="ui-alert-warning mt-2">{t("publishIncomplete")}</div>
          ) : (
            <div className="ui-alert-success mt-2">{t("publishReady")}</div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3">
            <div>
              <div className="ui-label">{t("metaPageId")}</div>
              {filteredPages.length > 0 ? (
                <select
                  value={metaPageId}
                  onChange={(e) => setMetaPageId(e.target.value)}
                  className="mt-1 w-full rounded-xl ui-input"
                >
                  <option value="">{t("selectPage")}</option>
                  {filteredPages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="ui-alert-warning mt-1">
                  {t("noPagesHint")}{" "}
                  <Link href="/settings/meta-assets" className="ui-link">
                    {t("refreshMetaAssets")}
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <UxSaveButton
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(
                    `/api/clients/${encodeURIComponent(clientId)}/meta-settings`,
                    {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ metaPageId: metaPageId || null })
                    }
                  );
                  const j = await res.json();
                  setPublishReady(!!j.publish?.pageId);
                  notify(j.ok ? "success" : "error", j.ok ? t("publishSaved") : j.error ?? t("loadError"));
                });
              }}
              label={t("savePublish")}
            />
          </div>
        </UxFormCard>

        <ClientMetaExtras
          clientId={clientId}
          defaultAdAccountId={linkedMetaIds[0] ?? data.accounts[0]?.metaAdAccountId ?? ""}
        />

        <UxFormCard>
          <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{t("agencyBrainTitle")}</div>
          <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{t("agencyBrainHint")}</p>
          <div className="mt-3">
            <div className="ui-label">{t("nicheLabel")}</div>
            <select
              value={clientNiche}
              onChange={(e) => setClientNiche(e.target.value)}
              className="mt-1 w-full max-w-md rounded-xl ui-input text-sm"
            >
              {CLIENT_NICHE_OPTIONS.map((opt) => (
                <option key={opt.value || "unset"} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("nicheHint")}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <UxSaveButton
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(
                    `/api/clients/${encodeURIComponent(clientId)}/context`,
                    {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        niche: clientNiche || null
                      })
                    }
                  );
                  const j = await res.json();
                  if (j.ok) setClientNiche(j.niche ?? "");
                  notify(
                    j.ok ? "success" : "error",
                    j.ok ? t("nicheSaved") : j.error ?? t("loadError")
                  );
                });
              }}
              label={isPending ? "…" : t("nicheSave")}
            />
          </div>
        </UxFormCard>

        <UxFormCard>
          <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{t("adAccounts")}</div>
          <p className="mt-1 text-xs" style={{ color: "var(--text-dim)" }}>{t("adAccountsHint")}</p>
          {businesses.length > 0 ? (
            <div className="mt-3">
              <div className="ui-label">{t("clientBmLabel")}</div>
              <select
                value={bmFilter}
                onChange={(e) => setBmFilter(e.target.value)}
                className="mt-1 w-full max-w-md rounded-xl ui-input text-sm"
              >
                <option value="">{t("selectBmPlaceholder")}</option>
                <option value="unassigned">{t("unassignedBm")}</option>
                {businesses
                  .filter((bm) => bm.metaBusinessId !== "unassigned")
                  .map((bm) => (
                    <option key={bm.metaBusinessId} value={bm.metaBusinessId}>
                      {bm.name} ({bm.adAccountCount})
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{t("clientBmHint")}</p>
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {filteredAccounts.length ? (
              filteredAccounts.map((a) => (
                <label
                  key={a.metaAdAccountId}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3 text-xs text-[var(--text-dim)]"
                >
                  <input
                    type="checkbox"
                    checked={linkedMetaIds.includes(a.metaAdAccountId)}
                    onChange={(e) => {
                      setLinkedMetaIds((prev) =>
                        e.target.checked
                          ? [...prev, a.metaAdAccountId]
                          : prev.filter((id) => id !== a.metaAdAccountId)
                      );
                    }}
                    className="accent-violet-600"
                  />
                  <span className="flex-1">
                    {a.label}
                    {a.metaBusinessName ? (
                      <span className="ml-1 text-[10px] text-[var(--text-dimmer)]">· {a.metaBusinessName}</span>
                    ) : null}
                  </span>
                </label>
              ))
            ) : (
              <div className="text-xs text-[var(--text-dim)]">
                {t("noAccounts")}{" "}
                <Link href="/settings/meta-assets" className="ui-link">
                  {t("refreshMetaAssets")}
                </Link>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <UxSaveButton
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(
                    `/api/clients/${encodeURIComponent(clientId)}/ad-accounts`,
                    {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        metaAdAccountIds: linkedMetaIds,
                        metaBusinessId: bmFilter || null
                      })
                    }
                  );
                  const j = await res.json();
                  if (j.ok) {
                    if (bmFilter) setClientMetaBusinessId(bmFilter);
                    reload();
                    fetch(`/api/clients/${encodeURIComponent(clientId)}/ad-accounts`)
                      .then((r) => r.json())
                      .then((j2) => {
                        setAvailableAccounts(j2.available ?? []);
                        setLinkedMetaIds(j2.linkedMetaIds ?? []);
                      });
                  }
                  notify(j.ok ? "success" : "error", j.ok ? t("accountsSaved") : j.error ?? t("loadError"));
                });
              }}
              label={isPending ? "…" : t("saveAccounts")}
            />
          </div>
        </UxFormCard>

        {!isProtectedClient(data.name, data.slug) ? (
          <div className="ui-card ui-alert-danger p-4">
            <div className="text-sm font-semibold text-[var(--danger)]">{t("deleteZoneTitle")}</div>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{t("deleteHint")}</p>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDeleteClient}
              className="ui-btn-danger mt-3 px-3 py-2 text-xs disabled:opacity-60"
            >
              {isPending ? "…" : t("deleteClient")}
            </button>
          </div>
        ) : null}

      </section>

      <aside className="space-y-3">
        <div className="ui-card p-4">
          <div className="text-sm font-semibold">{t("aiQuick")}</div>
          <div className="mt-2 text-xs text-[var(--text-dim)]">{t("aiQuickHint")}</div>
          <Link
            href="/agency-brain/suggestions"
            className="ui-btn-secondary mt-3 inline-block px-3 py-2 text-xs"
          >
            {t("openActionCenter")}
          </Link>
        </div>
      </aside>
    </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-card p-3">
      <div className="ui-label">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function GoalField({
  label,
  value,
  onChange
}: {
  label: string;
  value?: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="font-body text-xs font-medium" style={{ color: "var(--text-dim)" }}>{label}</label>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="mt-1.5 w-full rounded-xl border px-4 py-2.5 font-body text-sm outline-none"
        style={{
          background: "var(--surface-bg)",
          borderColor: "var(--border-color)",
          color: "var(--text-main)"
        }}
      />
    </div>
  );
}

function UxSaveButton({
  label,
  disabled,
  onClick
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl px-5 py-2.5 font-heading text-xs font-bold shadow-md transition-all hover:brightness-110 disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, #f5a623, #e8920d)",
        color: "#0f1419",
        boxShadow: "0 4px 12px rgba(245,166,35,0.3)"
      }}
    >
      {label}
    </button>
  );
}
