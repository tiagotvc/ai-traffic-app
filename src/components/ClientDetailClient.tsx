"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { ClientMetaExtras } from "@/components/ClientMetaExtras";
import { ClientReadinessChecklist } from "@/components/ClientReadinessChecklist";
import { SyncNowButton } from "@/components/SyncNowButton";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { Link } from "@/i18n/navigation";
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

export function ClientDetailClient({ clientId }: { clientId: string }) {
  const t = useTranslations("client");
  const locale = useLocale();
  const [data, setData] = useState<ClientData | null>(null);
  const [goals, setGoals] = useState<Goals>({ enabled: true, windowDays: 1, objective: "leads" });
  const [availableAccounts, setAvailableAccounts] = useState<AccountOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [clientMetaBusinessId, setClientMetaBusinessId] = useState<string>("");
  const [bmFilter, setBmFilter] = useState<string>("");
  const [linkedMetaIds, setLinkedMetaIds] = useState<string[]>([]);
  const [metaPageId, setMetaPageId] = useState("");
  const [metaLinkUrl, setMetaLinkUrl] = useState("");
  const [availablePages, setAvailablePages] = useState<
    Array<{ id: string; name: string; metaBusinessId?: string | null }>
  >([]);
  const [publishReady, setPublishReady] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isPending, startTransition] = useTransition();

  const notify = useCallback((type: Feedback["type"], text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 6000);
  }, []);

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
          setMetaLinkUrl(j.client.metaLinkUrl ?? "");
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
        effectiveBm === "unassigned" ? !p.metaBusinessId : p.metaBusinessId === effectiveBm
      )
    : availablePages;

  if (!data) {
    return (
      <div className="ui-card p-8 text-center text-sm text-slate-500">
        {feedback?.text ?? t("loading")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {feedback ? (
        <div
          className={`lg:col-span-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
          role="status"
        >
          {feedback.text}
        </div>
      ) : null}

      <section className="lg:col-span-2 space-y-3">
        {showOnboarding ? (
          <div className="ui-card border-violet-200 bg-violet-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t("onboardingTitle")}</div>
                <p className="mt-2 text-xs text-slate-600">{t("onboardingIntro")}</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  <li>{t("onboardingClient")}</li>
                  <li>{t("onboardingAdAccount")}</li>
                  <li>{t("onboardingCampaign")}</li>
                </ul>
                <p className="mt-3 text-xs font-medium text-violet-800">{t("onboardingSteps")}</p>
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
                className="shrink-0 rounded-lg border border-violet-200 bg-white px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
              >
                {t("onboardingDismiss")}
              </button>
            </div>
          </div>
        ) : null}

        <ClientReadinessChecklist clientId={clientId} />
        <SyncStatusBanner clientId={clientId} />

        <div className="ui-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{data.name}</div>
              <div className="mt-1 text-xs text-slate-500">{t("active")}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SyncNowButton clientId={clientId} compact />
              <Link
                href={`/campaigns?client=${encodeURIComponent(data.slug)}`}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("viewCampaigns")}
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label={t("spend")} value={formatBRL(data.kpis.spend, locale)} />
            <Kpi label={t("conversions")} value={String(Math.round(data.kpis.conversions))} />
            <Kpi label={t("cpa")} value={formatBRL(data.kpis.cpa, locale)} />
            <Kpi label="ROAS" value={formatRoas(data.kpis.roas, locale)} />
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-sm font-semibold">{t("goalsTitle")}</div>
          <div className="mt-1 text-xs text-slate-500">{t("goalsHint")}</div>
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
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={goals.enabled ?? true}
              onChange={(e) => setGoals((g) => ({ ...g, enabled: e.target.checked }))}
              className="accent-violet-600"
            />
            {t("goalsEnabled")}
          </label>
          <div className="mt-3 flex justify-end">
            <button
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
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {t("saveGoals")}
            </button>
          </div>
        </div>

        <div className="ui-card p-4">
          <div className="text-sm font-semibold">{t("publishTitle")}</div>
          <div className="mt-1 text-xs text-slate-500">{t("publishHint")}</div>
          {!publishReady ? (
            <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("publishIncomplete")}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
              {t("publishReady")}
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">{t("metaPageId")}</div>
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
                <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {t("noPagesHint")}{" "}
                  <Link href="/settings/meta-assets" className="font-medium text-violet-700 underline">
                    {t("refreshMetaAssets")}
                  </Link>
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500">{t("metaLinkUrl")}</div>
              <input
                value={metaLinkUrl}
                onChange={(e) => setMetaLinkUrl(e.target.value)}
                placeholder="https://seusite.com.br"
                className="mt-1 w-full rounded-xl ui-input"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const res = await fetch(
                    `/api/clients/${encodeURIComponent(clientId)}/meta-settings`,
                    {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ metaPageId: metaPageId || null, metaLinkUrl: metaLinkUrl || null })
                    }
                  );
                  const j = await res.json();
                  setPublishReady(!!(j.publish?.pageId && j.publish?.linkUrl));
                  notify(j.ok ? "success" : "error", j.ok ? t("publishSaved") : j.error ?? t("loadError"));
                });
              }}
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {t("savePublish")}
            </button>
          </div>
        </div>

        <ClientMetaExtras
          clientId={clientId}
          defaultAdAccountId={linkedMetaIds[0] ?? data.accounts[0]?.metaAdAccountId ?? ""}
        />

        <div className="ui-card p-4">
          <div className="text-sm font-semibold">{t("adAccounts")}</div>
          <p className="mt-1 text-xs text-slate-500">{t("adAccountsHint")}</p>
          {businesses.length > 0 ? (
            <div className="mt-3">
              <div className="text-xs text-slate-500">{t("clientBmLabel")}</div>
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
              <p className="mt-1 text-[10px] text-slate-500">{t("clientBmHint")}</p>
            </div>
          ) : null}
          <div className="mt-3 space-y-2">
            {filteredAccounts.length ? (
              filteredAccounts.map((a) => (
                <label
                  key={a.metaAdAccountId}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600"
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
                      <span className="ml-1 text-[10px] text-slate-400">· {a.metaBusinessName}</span>
                    ) : null}
                  </span>
                </label>
              ))
            ) : (
              <div className="text-xs text-slate-500">
                {t("noAccounts")}{" "}
                <Link href="/settings/meta-assets" className="text-violet-600 underline">
                  {t("refreshMetaAssets")}
                </Link>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <button
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
              className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {isPending ? "…" : t("saveAccounts")}
            </button>
          </div>
        </div>

      </section>

      <aside className="space-y-3">
        <div className="ui-card p-4">
          <div className="text-sm font-semibold">{t("aiQuick")}</div>
          <div className="mt-2 text-xs text-slate-500">{t("aiQuickHint")}</div>
          <Link
            href="/ai-center"
            className="mt-3 inline-block rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t("openAiCenter")}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
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
      <div className="text-xs text-slate-500">{label}</div>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="mt-1 w-full rounded-xl ui-input"
      />
    </div>
  );
}
