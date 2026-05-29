"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";

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
};

type MetaAudience = { id: string; name?: string; subtype?: string };

type SourceType = "pixel" | "customer_list" | "engagement" | "app";

const SOURCE_OPTIONS: { id: SourceType; icon: string }[] = [
  { id: "pixel", icon: "📡" },
  { id: "customer_list", icon: "👥" },
  { id: "engagement", icon: "💙" },
  { id: "app", icon: "📱" }
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

  const [hub, setHub] = useState<{
    metaConnected: boolean;
    clients: HubClient[];
    audiencesByAccount: Record<string, MetaAudience[]>;
    savedAudiences: SavedAudience[];
    lookalikeJobs: Array<{ id: string; name: string; status: string; ratioPct: number; country: string }>;
    templateGroups: Array<{ clientSlug: string; clientName: string; templateCount: number; objective: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [clientSlug, setClientSlug] = useState("");
  const [source, setSource] = useState<SourceType>("pixel");
  const [seedId, setSeedId] = useState("");
  const [event, setEvent] = useState<(typeof EVENTS)[number]>("Purchase");
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]>("BR");
  const [ratio, setRatio] = useState<number>(0.01);
  const [step, setStep] = useState(1);
  const [sideTab, setSideTab] = useState<"saved" | "excluded" | "templates">("saved");
  const [search, setSearch] = useState("");

  const load = useCallback((refresh = false) => {
    fetch(`/api/audiences/hub${refresh ? "?refresh=1" : ""}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) {
          setError(j.error ?? "Erro ao carregar");
          return;
        }
        setHub({
          metaConnected: j.metaConnected,
          clients: j.clients ?? [],
          audiencesByAccount: j.audiencesByAccount ?? {},
          savedAudiences: j.savedAudiences ?? [],
          lookalikeJobs: j.lookalikeJobs ?? [],
          templateGroups: j.templateGroups ?? []
        });
        if (!clientSlug && j.clients?.[0]?.slug) setClientSlug(j.clients[0].slug);
      })
      .catch(() => setError("Erro ao carregar públicos"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const client = hub?.clients.find((c) => c.slug === clientSlug) ?? hub?.clients[0];
  const adAccountId = client?.defaultAdAccountId ?? client?.adAccounts[0]?.metaAdAccountId ?? "";
  const accountAudiences = adAccountId ? (hub?.audiencesByAccount[adAccountId] ?? []) : [];
  const seeds = useMemo(() => filterSeeds(accountAudiences, source), [accountAudiences, source]);

  useEffect(() => {
    if (seeds.length && !seeds.some((s) => s.id === seedId)) {
      setSeedId(seeds[0]?.id ?? "");
    }
  }, [seeds, seedId]);

  const lookalikeName = useMemo(() => {
    const pct = Math.round(ratio * 100);
    return `LA ${pct}% — ${event} ${country}`;
  }, [ratio, event, country]);

  const filteredSaved = useMemo(() => {
    if (!hub) return [];
    let list = hub.savedAudiences;
    if (sideTab === "excluded" && client) {
      const excluded = new Set(client.defaultExcludedAudienceIds);
      list = list.filter((a) => excluded.has(a.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.clientName.toLowerCase().includes(q) ||
          a.sourceLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [hub, sideTab, client, search]);

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
        load(true);
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
      await fetch(`/api/clients/${encodeURIComponent(client.slug)}/meta-settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defaultCustomAudienceIds: [...current] })
      });
      load();
    });
  };

  const steps = [
    { n: 1, label: t("stepSource") },
    { n: 2, label: t("stepEvent") },
    { n: 3, label: t("stepCountry") },
    { n: 4, label: t("stepRatio") },
    { n: 5, label: t("stepReview") }
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="text-violet-600">👥</span>
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => load(true)} className="ui-btn-secondary text-sm">
            {t("refresh")}
          </button>
          <Link href="/clients" className="ui-btn-secondary text-sm">
            {t("templatesByClient")}
          </Link>
        </div>
      </div>

      {!hub?.metaConnected ? (
        <div className="ui-alert-warning text-sm">
          {t("metaRequired")}{" "}
          <Link href="/settings" className="font-semibold text-violet-700 underline">
            {t("connectMeta")}
          </Link>
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="ui-card p-5">
            <h2 className="text-lg font-semibold text-slate-900">{t("wizardTitle")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {steps.map((s) => (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => setStep(s.n)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                    step === s.n ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                      step >= s.n ? "bg-white/20" : ""
                    }`}
                  >
                    {s.n}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-500">{t("selectClient")}</label>
              <select
                value={clientSlug}
                onChange={(e) => {
                  setClientSlug(e.target.value);
                  setSeedId("");
                }}
                className="ui-select mt-1 w-full max-w-md"
              >
                {(hub?.clients ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {client && !adAccountId ? (
                <p className="mt-2 text-xs text-amber-700">
                  {t("noAdAccount")}{" "}
                  <Link href={`/clients/${client.slug}`} className="underline">
                    {t("linkAccount")}
                  </Link>
                </p>
              ) : null}
            </div>

            {step === 1 ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">{t("stepSourceDesc")}</p>
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
                        <span className="text-2xl">{opt.icon}</span>
                        {source === opt.id ? (
                          <span className="text-violet-600">✓</span>
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
                      <span>
                        Pixel — {client.name}
                      </span>
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
                    disabled={isPending || !hub?.metaConnected || !seedId}
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
            <span className="font-semibold">💡 {t("tipTitle")}</span> {t("tipBody")}
          </div>
        </div>

        <aside className="ui-card flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden p-0">
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
                onClick={() => setSideTab(key)}
                className={`flex-1 px-2 py-3 text-xs font-medium ${
                  sideTab === key
                    ? "border-b-2 border-violet-600 text-violet-600"
                    : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchAudiences")}
              className="ui-input w-full text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {sideTab === "templates" ? (
              <div className="space-y-2">
                {(hub?.templateGroups ?? []).map((g) => (
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
                {!hub?.templateGroups.length ? (
                  <p className="text-xs text-slate-500">{t("noTemplates")}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSaved.map((a) => {
                  const attached = client?.defaultCustomAudienceIds.includes(a.id);
                  return (
                    <div
                      key={`${a.adAccountId}-${a.id}`}
                      className="rounded-xl border border-slate-100 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                          {initials(a.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900">{a.name}</div>
                          <Badge variant={kindBadge(a.kind)}>{t(`kind.${a.kind}`)}</Badge>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {a.sourceLabel} · {a.clientName}
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          {a.country ?? "BR"}
                          {a.ratioPct != null ? ` · ${a.ratioPct}%` : ""}
                        </div>
                      </div>
                      {sideTab === "saved" ? (
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
                {!filteredSaved.length ? (
                  <p className="text-xs text-slate-500">
                    {hub?.metaConnected ? t("noAudiences") : t("metaRequired")}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {hub?.lookalikeJobs.length ? (
            <div className="border-t border-slate-100 p-3">
              <div className="text-xs font-semibold text-slate-500">{t("recentJobs")}</div>
              <ul className="mt-2 space-y-1 text-xs">
                {hub.lookalikeJobs.slice(0, 5).map((j) => (
                  <li key={j.id} className="flex justify-between text-slate-600">
                    <span className="truncate">{j.name}</span>
                    <Badge variant={j.status === "ready" ? "success" : j.status === "failed" ? "danger" : "warning"}>
                      {j.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
