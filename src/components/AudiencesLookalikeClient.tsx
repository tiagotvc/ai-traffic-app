"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";
import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";

const AUDIENCES_ICON_PATH =
  "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z";

const SOURCE_ICON_PATHS = {
  pixel:
    "M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z",
  customer_list:
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  engagement:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z",
  app: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
} as const;

type HubClient = {
  id: string;
  slug: string;
  name: string;
  metaPixelId: string | null;
  defaultAdAccountId: string | null;
  adAccounts: { metaAdAccountId: string; label: string }[];
  defaultCustomAudienceIds: string[];
  defaultExcludedAudienceIds: string[];
};

type SavedAudience = {
  id: string;
  name: string;
  kind: string;
  subtype?: string;
  clientName: string;
  clientSlug: string;
  clientId: string;
  adAccountId: string;
  sourceLabel: string;
  country?: string;
  ratioPct?: number;
  updatedAt: string;
  approximateCount?: number;
};

type MetaAudience = { id: string; name?: string; subtype?: string };

type AccountOpt = { metaAdAccountId: string; label: string };

type SourceType = "pixel" | "customer_list" | "engagement" | "app";

const SOURCE_OPTIONS: { id: SourceType; iconPath: string }[] = [
  { id: "pixel", iconPath: SOURCE_ICON_PATHS.pixel },
  { id: "customer_list", iconPath: SOURCE_ICON_PATHS.customer_list },
  { id: "engagement", iconPath: SOURCE_ICON_PATHS.engagement },
  { id: "app", iconPath: SOURCE_ICON_PATHS.app }
];

const EVENTS = ["Purchase", "Lead", "ViewContent", "AddToCart", "CompleteRegistration"] as const;
const COUNTRIES = ["BR", "US", "PT", "MX", "AR"] as const;
const RATIOS = [0.01, 0.02, 0.03, 0.05, 0.1] as const;

function kindBadge(kind: string) {
  if (kind === "lookalike") return "brand" as const;
  if (kind === "engagement") return "warning" as const;
  if (kind === "app") return "neutral" as const;
  return "success" as const;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function filterSeeds(audiences: MetaAudience[], source: SourceType) {
  const seeds = audiences.filter((a) => !(a.subtype ?? "").toUpperCase().includes("LOOKALIKE"));
  if (source === "engagement") {
    return seeds.filter((a) => (a.subtype ?? "").toUpperCase().includes("ENGAGEMENT"));
  }
  if (source === "app") {
    return seeds.filter((a) => (a.subtype ?? "").toUpperCase().includes("APP"));
  }
  if (source === "customer_list") {
    return seeds.filter((a) => {
      const s = (a.subtype ?? "").toUpperCase();
      return s === "CUSTOM" || s.includes("LIST");
    });
  }
  return seeds.filter((a) => {
    const s = (a.subtype ?? "").toUpperCase();
    return !s.includes("ENGAGEMENT") && !s.includes("APP");
  });
}

export function AudiencesLookalikeClient() {
  const t = useTranslations("audiences");
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<"list" | "create">("list");
  const [hubLoading, setHubLoading] = useState(true);
  const [audiencesLoading, setAudiencesLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [lookalikeJobs, setLookalikeJobs] = useState<
    Array<{ id: string; name: string; status: string; ratioPct: number; country: string }>
  >([]);
  const [templateGroups, setTemplateGroups] = useState<
    Array<{ clientSlug: string; clientName: string; templateCount: number; objective: string }>
  >([]);

  const [audiences, setAudiences] = useState<SavedAudience[]>([]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [clientSlug, setClientSlug] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [source, setSource] = useState<SourceType>("pixel");
  const [seedId, setSeedId] = useState("");
  const [event, setEvent] = useState<(typeof EVENTS)[number]>("Purchase");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>("BR");
  const [ratio, setRatio] = useState<number>(0.01);
  const [step, setStep] = useState(1);
  const [listTab, setListTab] = useState<"saved" | "excluded" | "templates">("saved");
  const [search, setSearch] = useState("");
  const clientsRef = useRef(clients);
  clientsRef.current = clients;

  const loadContext = useCallback(async () => {
    setHubLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audiences/hub");
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Erro ao carregar");
        return;
      }
      setMetaConnected(!!j.metaConnected);
      setClients(j.clients ?? []);
      setLookalikeJobs(j.lookalikeJobs ?? []);
      setTemplateGroups(j.templateGroups ?? []);
      setClientSlug((prev) => prev || j.clients?.[0]?.slug || "");
    } catch {
      setError("Erro ao carregar públicos");
    } finally {
      setHubLoading(false);
    }
  }, []);

  const loadAudiences = useCallback(
    async (refresh = false) => {
      if (!clientSlug || !adAccountId) {
        setAudiences([]);
        return;
      }
      if (!metaConnected) {
        setAudiences([]);
        return;
      }
      setAudiencesLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          clientId: clientSlug,
          adAccountId
        });
        if (refresh) qs.set("refresh", "1");
        const res = await fetch(`/api/audiences/hub?${qs}`);
        const j = await res.json();
        if (!res.ok || !j.ok) {
          setError(j.error ?? "Erro ao carregar públicos da Meta");
          setAudiences([]);
          return;
        }
        setAudiences(j.savedAudiences ?? []);
      } catch {
        setError("Erro ao carregar públicos da Meta");
        setAudiences([]);
      } finally {
        setAudiencesLoading(false);
      }
    },
    [clientSlug, adAccountId, metaConnected]
  );

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!clientSlug) {
      setAccounts([]);
      setAdAccountId("");
      return;
    }
    setAdAccountId("");
    setAccountsLoading(true);
    fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(clientSlug)}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j.accounts ?? []) as AccountOpt[];
        setAccounts(list);
        const client = clientsRef.current.find((c) => c.slug === clientSlug);
        const nextAccount =
          client?.defaultAdAccountId ??
          j.defaultAdAccountId ??
          list[0]?.metaAdAccountId ??
          "";
        setAdAccountId(nextAccount);
      })
      .catch(() => {
        setAccounts([]);
        setAdAccountId("");
      })
      .finally(() => setAccountsLoading(false));
  }, [clientSlug]);

  useEffect(() => {
    void loadAudiences();
  }, [loadAudiences]);

  const client = clients.find((c) => c.slug === clientSlug) ?? clients[0];
  const accountAudiences = useMemo(
    () =>
      audiences.map((a) => ({
        id: a.id,
        name: a.name,
        subtype: a.subtype
      })),
    [audiences]
  );
  const seeds = useMemo(() => filterSeeds(accountAudiences, source), [accountAudiences, source]);

  useEffect(() => {
    if (seeds.length && !seeds.some((s) => s.id === seedId)) {
      setSeedId(seeds[0]?.id ?? "");
    }
    if (!seeds.length) setSeedId("");
  }, [seeds, seedId]);

  const lookalikeName = useMemo(() => {
    const pct = Math.round(ratio * 100);
    return `LA ${pct}% — ${event} ${country}`;
  }, [ratio, event, country]);

  const filteredAudiences = useMemo(() => {
    let list = audiences;
    if (listTab === "excluded" && client) {
      const excluded = new Set(client.defaultExcludedAudienceIds);
      list = list.filter((a) => excluded.has(a.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sourceLabel.toLowerCase().includes(q) ||
          (a.subtype ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [audiences, listTab, client, search]);

  const createLookalike = () => {
    if (!client || !adAccountId || !seedId) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(client.slug)}/lookalike`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: lookalikeName,
          adAccountId,
          originAudienceId: seedId,
          ratio,
          country
        })
      });
      const j = await res.json();
      if (j.ok) {
        setMessage(t("createdSuccess"));
        setStep(1);
        setView("list");
        void loadAudiences(true);
        void loadContext();
      } else {
        setError(j.error ?? t("createdFailed"));
      }
    });
  };

  const toggleAttach = (audienceId: string, attach: boolean) => {
    if (!client) return;
    const current = new Set(client.defaultCustomAudienceIds);
    if (attach) current.add(audienceId);
    else current.delete(audienceId);
    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(client.slug)}/meta-settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defaultCustomAudienceIds: [...current] })
      });
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) =>
            c.slug === client.slug ? { ...c, defaultCustomAudienceIds: [...current] } : c
          )
        );
      }
    });
  };

  const steps = [
    { n: 1, label: t("stepSource") },
    { n: 2, label: t("stepEvent") },
    { n: 3, label: t("stepCountry") },
    { n: 4, label: t("stepRatio") },
    { n: 5, label: t("stepReview") }
  ];

  const selectors = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-slate-500">{t("selectClient")}</span>
        <select
          value={clientSlug}
          onChange={(e) => {
            setClientSlug(e.target.value);
            setSeedId("");
          }}
          disabled={hubLoading}
          className="ui-select !w-auto min-w-[12rem] text-sm"
        >
          {clients.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {accounts.length > 1 ? (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-slate-500">{t("selectAdAccount")}</span>
          <select
            value={adAccountId}
            onChange={(e) => {
              setAdAccountId(e.target.value);
              setSeedId("");
            }}
            disabled={accountsLoading}
            className="ui-select !w-auto min-w-[12rem] text-sm"
          >
            {accounts.map((a) => (
              <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {client && !adAccountId && !accountsLoading ? (
        <p className="text-xs text-amber-700">
          {t("noAdAccount")}{" "}
          <Link href={`/clients/${client.slug}`} className="underline">
            {t("linkAccount")}
          </Link>
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {view === "create" ? t("breadcrumbCreate") : t("breadcrumbList")}
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <OutlineIcon d={AUDIENCES_ICON_PATH} className="h-7 w-7 text-violet-600" />
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {view === "list" ? (
            <button
              type="button"
              onClick={() => {
                setView("create");
                setStep(1);
              }}
              disabled={!metaConnected || !adAccountId}
              className="ui-btn-primary text-sm"
            >
              {t("createNewAudience")}
            </button>
          ) : (
            <button type="button" onClick={() => setView("list")} className="ui-btn-secondary text-sm">
              {t("backToList")}
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadAudiences(true)}
            disabled={!adAccountId || audiencesLoading}
            className="ui-btn-secondary text-sm"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {!hubLoading && !metaConnected ? (
        <div className="ui-alert-warning text-sm">
          {t("metaRequired")}{" "}
          <Link href="/settings" className="font-semibold text-violet-700 underline">
            {t("connectMeta")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {view === "list" ? (
        <div className="space-y-4">
          <div className="ui-card p-4">{selectors}</div>

          <div className="ui-card overflow-hidden p-0">
            <div className="flex border-b border-slate-100">
              {(
                [
                  ["saved", t("tabSaved")],
                  ["excluded", t("tabExcluded")],
                  ["templates", t("tabTemplates")]
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setListTab(key)}
                  className={`flex-1 px-3 py-3 text-xs font-medium sm:text-sm ${
                    listTab === key
                      ? "border-b-2 border-violet-600 text-violet-600"
                      : "text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {listTab !== "templates" ? (
              <div className="border-b border-slate-100 p-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchAudiences")}
                  className="ui-input w-full text-sm"
                />
              </div>
            ) : null}

            <div className="p-3">
              {hubLoading || accountsLoading ? (
                <TableSkeleton rows={4} />
              ) : !clientSlug || !adAccountId ? (
                <p className="py-8 text-center text-sm text-slate-500">{t("selectClientFirst")}</p>
              ) : audiencesLoading ? (
                <TableSkeleton rows={6} />
              ) : listTab === "templates" ? (
                <div className="space-y-2">
                  {templateGroups.map((g) => (
                    <Link
                      key={g.clientSlug}
                      href={`/clients/${g.clientSlug}`}
                      className="block rounded-xl border border-slate-100 p-3 hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{g.clientName}</div>
                      <div className="text-xs text-slate-500">
                        {g.objective} · {t("templateCount", { count: g.templateCount })}
                      </div>
                    </Link>
                  ))}
                  {!templateGroups.length ? (
                    <p className="text-xs text-slate-500">{t("noTemplates")}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAudiences.map((a) => {
                    const attached = client?.defaultCustomAudienceIds.includes(a.id);
                    return (
                      <div key={`${a.adAccountId}-${a.id}`} className="rounded-xl border border-slate-100 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                            {initials(a.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-900">{a.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant={kindBadge(a.kind)}>{t(`kind.${a.kind}`)}</Badge>
                              {a.subtype ? (
                                <span className="text-[11px] text-slate-400">{a.subtype}</span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">{a.sourceLabel}</div>
                          </div>
                          <div className="text-right text-[10px] text-slate-400">
                            {a.country ?? "BR"}
                            {a.ratioPct != null ? ` · ${a.ratioPct}%` : ""}
                            {a.approximateCount != null ? (
                              <div className="mt-0.5">~{a.approximateCount.toLocaleString()}</div>
                            ) : null}
                          </div>
                        </div>
                        {listTab === "saved" ? (
                          <button
                            type="button"
                            onClick={() => toggleAttach(a.id, !attached)}
                            className="mt-2 w-full rounded-lg border border-slate-200 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {attached ? t("detachDefault") : t("attachDefault")}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  {!filteredAudiences.length ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      {!metaConnected ? t("metaRequired") : t("noAudiences")}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {lookalikeJobs.length ? (
              <div className="border-t border-slate-100 p-3">
                <div className="text-xs font-semibold text-slate-500">{t("recentJobs")}</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {lookalikeJobs.slice(0, 5).map((j) => (
                    <li key={j.id} className="flex justify-between text-slate-600">
                      <span className="truncate">{j.name}</span>
                      <Badge
                        variant={
                          j.status === "ready" ? "success" : j.status === "failed" ? "danger" : "warning"
                        }
                      >
                        {j.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="ui-card p-4">{selectors}</div>

          <div className="ui-card p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t("wizardTitle")}</h2>
            <div className="mt-4 flex items-center gap-0 overflow-x-auto pb-1">
              {steps.map((s, idx) => (
                <div key={s.n} className="flex min-w-0 flex-1 items-center">
                  <button
                    type="button"
                    onClick={() => step >= s.n && setStep(s.n)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                      step === s.n
                        ? "bg-violet-600 text-white"
                        : step > s.n
                          ? "bg-violet-100 text-violet-700"
                          : "bg-slate-100 text-slate-600"
                    } ${step >= s.n ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        step >= s.n ? "bg-white/20" : "bg-slate-200"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span className="whitespace-nowrap">{s.label}</span>
                  </button>
                  {idx < steps.length - 1 ? (
                    <div
                      className={`mx-1 h-0.5 min-w-[1rem] flex-1 ${step > s.n ? "bg-violet-400" : "bg-slate-200"}`}
                      aria-hidden
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepSourceDesc")}</p>
                {!adAccountId ? (
                  <p className="mt-3 text-sm text-slate-500">{t("selectClientFirst")}</p>
                ) : audiencesLoading ? (
                  <div className="mt-4">
                    <TableSkeleton rows={2} />
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {SOURCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSource(opt.id);
                            setSeedId("");
                          }}
                          className={`rounded-xl border p-4 text-left transition ${
                            source === opt.id
                              ? "border-violet-500 bg-violet-50 ring-1 ring-violet-500"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <OutlineIcon
                              d={opt.iconPath}
                              className={`h-6 w-6 ${source === opt.id ? "text-violet-600" : "text-slate-500"}`}
                            />
                            {source === opt.id ? (
                              <span className="text-violet-600">
                                <OutlineIcon
                                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  className="h-5 w-5"
                                />
                              </span>
                            ) : (
                              <span className="h-4 w-4 rounded-full border border-slate-300" />
                            )}
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">{t(`source.${opt.id}.title`)}</div>
                          <div className="mt-1 text-xs text-slate-500">{t(`source.${opt.id}.desc`)}</div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4">
                      <label className="text-xs font-medium text-slate-500">
                        {source === "pixel" ? t("pixelSelected") : t("seedAudience")}
                      </label>
                      {source === "pixel" && client?.metaPixelId ? (
                        <div className="mt-1 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                          <span>Pixel — {client.name}</span>
                          <span className="text-xs text-slate-400">{client.metaPixelId}</span>
                        </div>
                      ) : null}
                      <select
                        value={seedId}
                        onChange={(e) => setSeedId(e.target.value)}
                        className="ui-select mt-2 w-full"
                        disabled={!seeds.length}
                      >
                        {seeds.length === 0 ? (
                          <option value="">{t("noSeeds")}</option>
                        ) : (
                          seeds.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name ?? s.id} ({s.subtype})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!seedId}
                    onClick={() => setStep(2)}
                    className="ui-btn-primary"
                  >
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepEventDesc")}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {EVENTS.map((ev) => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => setEvent(ev)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                        event === ev
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                  <button type="button" onClick={() => setStep(3)} className="ui-btn-primary">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepCountryDesc")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCountry(c)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                        country === c
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-between">
                  <button type="button" onClick={() => setStep(2)} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                  <button type="button" onClick={() => setStep(4)} className="ui-btn-primary">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepRatioDesc")}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {RATIOS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRatio(r)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                        ratio === r
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200"
                      }`}
                    >
                      {Math.round(r * 100)}%
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-between">
                  <button type="button" onClick={() => setStep(3)} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                  <button type="button" onClick={() => setStep(5)} className="ui-btn-primary">
                    {t("next")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepReviewDesc")}</p>
                <dl className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewClient")}</dt>
                    <dd className="font-medium">{client?.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewSource")}</dt>
                    <dd>{t(`source.${source}.title`)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewSeed")}</dt>
                    <dd className="max-w-[200px] truncate">
                      {seeds.find((s) => s.id === seedId)?.name ?? seedId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewEvent")}</dt>
                    <dd>{event}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewCountry")}</dt>
                    <dd>{country}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">{t("reviewRatio")}</dt>
                    <dd>{Math.round(ratio * 100)}%</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <dt className="text-slate-500">{t("reviewName")}</dt>
                    <dd className="font-semibold text-violet-700">{lookalikeName}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-between">
                  <button type="button" onClick={() => setStep(4)} className="ui-btn-secondary">
                    {t("back")}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !metaConnected || !seedId}
                    onClick={createLookalike}
                    className="ui-btn-primary"
                  >
                    {isPending ? t("creating") : t("createLookalike")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-900">
            <span className="font-semibold">{t("tipTitle")}</span> {t("tipBody")}
          </div>
        </div>
      )}
    </div>
  );
}
