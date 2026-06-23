"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, Filter, Info, Plus, RefreshCw, Search, Target, Users } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { IconActionButton } from "@/components/ui/IconActionButton";
import { DsPageHeader } from "@/design-system";
import type { AudienceCreateContext, SavedAudienceSummary } from "@/components/audiences/create/types";
import { AudienceDetailModal } from "@/components/audiences/AudienceDetailModal";
import { Badge } from "@/components/ui/Badge";
import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { IconActionButton } from "@/components/ui/IconActionButton";
import { Link } from "@/i18n/navigation";
import { formatMetaGraphErrorMessage } from "@/lib/meta-graph-errors";
import { AudienceCreatorUxPage } from "@/uxpilot-ui/adapters/AudienceCreatorUxPage";

const AUDIENCES_ICON_PATH =
  "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z";

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

type AccountOpt = { metaAdAccountId: string; label: string };

function kindBadge(kind: string) {
  if (kind === "lookalike") return "brand" as const;
  if (kind === "engagement") return "warning" as const;
  if (kind === "app") return "neutral" as const;
  return "success" as const;
}

function AudienceListInfoBanner() {
  return (
    <div
      className="mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-body"
      style={{
        background: "rgba(245,166,35,0.07)",
        borderColor: "rgba(245,166,35,0.2)",
        color: "var(--text-dim)"
      }}
    >
      <Info size={16} className="mt-0.5 shrink-0" style={{ color: "#f5a623" }} />
      <span>
        Públicos sincronizados diretamente da Meta. Criativos com menos de{" "}
        <strong style={{ color: "#f5a623" }}>100 impressões</strong> no período não entram na classificação.
        Mantenha seus públicos organizados para facilitar o uso em novas campanhas.
      </span>
    </div>
  );
}

export function AudiencesLookalikeClient({ useUxChrome = false }: { useUxChrome?: boolean } = {}) {
  const t = useTranslations("audiences");
  const strip = useCommandStripOptional();
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

  const [audiences, setAudiences] = useState<SavedAudienceSummary[]>([]);
  const [accounts, setAccounts] = useState<AccountOpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [clientSlug, setClientSlug] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [listTab, setListTab] = useState<"saved" | "excluded" | "templates">("saved");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [detailAudience, setDetailAudience] = useState<SavedAudienceSummary | null>(null);
  const clientsRef = useRef(clients);
  clientsRef.current = clients;

  const openCreateView = useCallback(() => {
    setView("create");
    setError(null);
    setMessage(null);
  }, []);

  const createAudienceSlot = useMemo(
    () => (
      <IconActionButton
        icon={<Plus size={16} />}
        label={t("createNewAudience")}
        disabled={!metaConnected || !adAccountId}
        onClick={openCreateView}
      />
    ),
    [t, metaConnected, adAccountId, openCreateView]
  );

  useCommandStripPage({ hideFilters: true, hideSync: true });

  useEffect(() => {
    if (!useUxChrome || !strip) return;
    strip.setAdAccounts(accounts.map((a) => ({ id: a.metaAdAccountId, label: a.label })));
  }, [useUxChrome, accounts, strip]);

  useEffect(() => {
    if (!useUxChrome || !strip || hubLoading) return;
    if (strip.clientFilter && strip.clientFilter !== clientSlug) {
      setClientSlug(strip.clientFilter);
      return;
    }
    if (!strip.clientFilter && clientSlug) {
      strip.setClientFilter(clientSlug);
    }
  }, [useUxChrome, strip, strip?.clientFilter, clientSlug, hubLoading]);

  useEffect(() => {
    if (!useUxChrome || !strip) return;
    if (strip.accountFilter && strip.accountFilter !== adAccountId) {
      setAdAccountId(strip.accountFilter);
    }
  }, [useUxChrome, strip, strip?.accountFilter, adAccountId]);

  const loadContext = useCallback(async () => {
    setHubLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audiences/hub");
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setError(formatMetaGraphErrorMessage(j.error ?? "Erro ao carregar"));
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
        const qs = new URLSearchParams({ clientId: clientSlug, adAccountId });
        if (refresh) qs.set("refresh", "1");
        const res = await fetch(`/api/audiences/hub?${qs}`);
        const j = await res.json();
        if (!res.ok || !j.ok) {
          setError(formatMetaGraphErrorMessage(j.error ?? "Erro ao carregar públicos da Meta"));
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
          client?.defaultAdAccountId ?? j.defaultAdAccountId ?? list[0]?.metaAdAccountId ?? "";
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

  useEffect(() => {
    setPage(1);
  }, [listTab, search, clientSlug, adAccountId]);

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

  const totalPages = Math.max(1, Math.ceil(filteredAudiences.length / PAGE_SIZE));
  const pagedAudiences = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAudiences.slice(start, start + PAGE_SIZE);
  }, [filteredAudiences, page]);

  const createCtx: AudienceCreateContext | null =
    client && adAccountId
      ? {
          clientSlug,
          clientName: client.name,
          adAccountId,
          audiences,
          onSuccess: (msg) => setMessage(msg),
          onError: (msg) => setError(msg),
          onRefresh: () => {
            void loadAudiences(true);
            void loadContext();
          }
        }
      : null;

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

  const selectors = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium text-[var(--text-dim)]">{t("selectClient")}</span>
        <select
          value={clientSlug}
          onChange={(e) => setClientSlug(e.target.value)}
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
          <span className="shrink-0 text-xs font-medium text-[var(--text-dim)]">{t("selectAdAccount")}</span>
          <select
            value={adAccountId}
            onChange={(e) => setAdAccountId(e.target.value)}
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

  if (view === "create") {
    return (
      <>
        <AudienceDetailModal
          open={!!detailAudience}
          onClose={() => setDetailAudience(null)}
          summary={detailAudience}
          clientSlug={clientSlug}
          adAccountId={adAccountId}
        />
        {createCtx ? (
          <AudienceCreatorUxPage
            ctx={createCtx}
            clients={clients.map((c) => ({ slug: c.slug, name: c.name }))}
            clientSlug={clientSlug}
            onClientChange={setClientSlug}
            onBack={() => setView("list")}
          />
        ) : (
          <p className="py-12 text-center text-sm text-[var(--text-dim)]">{t("selectClientFirst")}</p>
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <AudienceDetailModal
        open={!!detailAudience}
        onClose={() => setDetailAudience(null)}
        summary={detailAudience}
        clientSlug={clientSlug}
        adAccountId={adAccountId}
      />
      {useUxChrome ? (
        <PageToolbar
          eyebrow="Públicos"
          icon={<Users size={16} style={{ color: "#f5a623" }} />}
          title={t("title")}
          subtitle={t("subtitle")}
          search={
            listTab !== "templates"
              ? {
                  value: search,
                  onChange: setSearch,
                  placeholder: t("searchAudiences")
                }
              : undefined
          }
          pageFilters={
            <FilterSelectDropdown
              icon={<Filter size={13} style={{ color: "#f5a623" }} />}
              label=""
              placeholder={t("tabSaved")}
              options={[
                { value: "saved", label: t("tabSaved") },
                { value: "excluded", label: t("tabExcluded") },
                { value: "templates", label: t("tabTemplates") }
              ]}
              value={listTab}
              onChange={(v) => setListTab(v as typeof listTab)}
              className="w-full max-w-none sm:w-auto"
            />
          }
          actions={createAudienceSlot}
        />
      ) : (
      <DsPageHeader
        breadcrumbs={t("breadcrumbList")}
        title={t("title")}
        subtitle={t("subtitle")}
        titleIcon={<Target size={16} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setView("create");
                setError(null);
                setMessage(null);
              }}
              disabled={!metaConnected || !adAccountId}
              className="ui-btn-primary text-sm"
            >
              {t("createNewAudience")}
            </button>
            <button
              type="button"
              onClick={() => void loadAudiences(true)}
              disabled={!adAccountId || audiencesLoading}
              className="ui-btn-secondary text-sm"
            >
              {t("refresh")}
            </button>
          </div>
        }
      />
      )}

      {!hubLoading && !metaConnected ? (
        <div className="ui-alert-warning text-sm">
          {t("metaRequired")}{" "}
          <Link href="/settings" className="ui-link">
            {t("connectMeta")}
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="ui-alert-danger text-sm">{error}</div>
      ) : null}
      {message ? (
        <div className="ui-alert-success text-sm">
          {message}
        </div>
      ) : null}

      <div className="space-y-4">
          {!useUxChrome ? <div className="ui-card p-4">{selectors}</div> : null}

          {listTab !== "templates" ? <AudienceListInfoBanner /> : null}

          <div
            className="overflow-hidden rounded-xl border"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            {!useUxChrome ? (
            <div className="flex border-b border-[var(--border-color)]">
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
                      ? "border-b-2 border-[var(--amber)] text-[var(--amber)]"
                      : "text-[var(--text-dim)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            ) : null}

            {listTab !== "templates" && !useUxChrome ? (
              <div className="border-b border-[var(--border-color)] p-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchAudiences")}
                  className="ui-input w-full text-sm"
                />
              </div>
            ) : null}

            {hubLoading || accountsLoading ? (
              <TableSkeleton bare rows={4} columns={["media", "badge", "select", "wide"]} />
            ) : !clientSlug || !adAccountId ? (
              <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("selectClientFirst")}</p>
            ) : audiencesLoading ? (
              <TableSkeleton bare rows={6} columns={["media", "badge", "select", "wide"]} />
            ) : listTab === "templates" ? (
              <div className={useUxChrome ? "divide-y" : "space-y-2 p-3"} style={useUxChrome ? { borderColor: "var(--border-color)" } : undefined}>
                  {templateGroups.map((g) => (
                    <Link
                      key={g.clientSlug}
                      href={`/clients/${g.clientSlug}`}
                      className={
                        useUxChrome
                          ? "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--row-hover)]"
                          : "block rounded-xl border border-[var(--border-color)] p-3 hover:bg-[var(--row-hover)]"
                      }
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: "rgba(245,166,35,0.12)" }}
                      >
                        <Users size={16} style={{ color: "#f5a623" }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[var(--text-main)]">{g.clientName}</div>
                        <div className="text-xs text-[var(--text-dim)]">
                          {g.objective} · {t("templateCount", { count: g.templateCount })}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {!templateGroups.length ? (
                    <p className="text-xs text-[var(--text-dim)]">{t("noTemplates")}</p>
                  ) : null}
                </div>
              ) : (
                <div className={useUxChrome ? "" : "space-y-2"}>
                  {pagedAudiences.map((a, index) => {
                    const attached = client?.defaultCustomAudienceIds.includes(a.id);
                    if (useUxChrome) {
                      const kindColor =
                        a.kind === "lookalike"
                          ? { bg: "rgba(16,185,129,0.12)", color: "#10b981" }
                          : a.kind === "engagement"
                            ? { bg: "rgba(245,166,35,0.13)", color: "#f59e0b" }
                            : { bg: "rgba(79,70,229,0.12)", color: "#818cf8" };
                      return (
                        <div
                          key={`${a.adAccountId}-${a.id}`}
                          className="group flex items-center gap-4 px-5 py-4 transition-colors"
                          style={{
                            borderBottom:
                              index === pagedAudiences.length - 1 && page >= totalPages
                                ? "none"
                                : "1px solid var(--border-color)"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--row-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{ background: "rgba(79,70,229,0.1)" }}
                          >
                            <Users size={16} style={{ color: "#818cf8" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="mb-1.5 truncate font-body text-sm font-semibold"
                              style={{ color: "var(--text-main)" }}
                            >
                              {a.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="rounded-full px-2 py-0.5 font-body text-[11px] font-medium"
                                style={{ background: kindColor.bg, color: kindColor.color }}
                              >
                                {t(`kind.${a.kind}`)}
                              </span>
                              {a.subtype ? (
                                <span
                                  className="rounded-full px-2 py-0.5 font-body text-[11px] font-medium"
                                  style={{
                                    background: "rgba(236,72,153,0.1)",
                                    color: "#f472b6",
                                    border: "1px solid rgba(236,72,153,0.15)"
                                  }}
                                >
                                  {a.subtype}
                                </span>
                              ) : null}
                              <span className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                                {a.sourceLabel}
                              </span>
                            </div>
                          </div>
                          <div className="mr-4 hidden shrink-0 text-right sm:block">
                            <span className="block font-body text-[10px]" style={{ color: "var(--text-dimmer)" }}>
                              {a.country ?? "BR"}
                            </span>
                            <span className="font-body text-xs font-semibold" style={{ color: "var(--text-dim)" }}>
                              {a.approximateCount != null
                                ? `~${a.approximateCount.toLocaleString()}`
                                : a.ratioPct != null
                                  ? `${a.ratioPct}%`
                                  : "—"}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDetailAudience(a)}
                              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs font-medium transition-all"
                              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                            >
                              <Eye size={12} />
                              {t("viewDetails")}
                            </button>
                            {listTab === "saved" ? (
                              <button
                                type="button"
                                onClick={() => toggleAttach(a.id, !attached)}
                                title={t("attachDefaultHint")}
                                disabled={isPending}
                                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs font-medium transition-all"
                                style={{
                                  borderColor: attached ? "rgba(245,166,35,0.35)" : "var(--border-color)",
                                  color: attached ? "#f5a623" : "var(--text-dim)",
                                  background: attached ? "rgba(245,166,35,0.08)" : "transparent"
                                }}
                              >
                                <Target size={12} />
                                {attached ? t("detachDefault") : t("attachDefault")}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={`${a.adAccountId}-${a.id}`} className="rounded-xl border border-[var(--border-color)] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-[var(--text-main)]">{a.name}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant={kindBadge(a.kind)}>{t(`kind.${a.kind}`)}</Badge>
                              {a.subtype ? (
                                <span className="text-[11px] text-[var(--text-dimmer)]">{a.subtype}</span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-[11px] text-[var(--text-dim)]">{a.sourceLabel}</div>
                          </div>
                          <div className="shrink-0 text-right text-[10px] text-[var(--text-dimmer)]">
                            {a.country ?? "BR"}
                            {a.ratioPct != null ? ` · ${a.ratioPct}%` : ""}
                            {a.approximateCount != null ? (
                              <div className="mt-0.5">~{a.approximateCount.toLocaleString()}</div>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailAudience(a)}
                            className="ui-btn-secondary px-3 py-1 text-[11px]"
                          >
                            {t("viewDetails")}
                          </button>
                          {listTab === "saved" ? (
                            <button
                              type="button"
                              onClick={() => toggleAttach(a.id, !attached)}
                              title={t("attachDefaultHint")}
                              disabled={isPending}
                              className={`rounded-lg border px-3 py-1 text-[11px] font-medium ${
                                attached
                                  ? "border-[rgba(245,166,35,0.3)] bg-[rgba(245,166,35,0.08)] text-[var(--amber)]"
                                  : "border-[var(--border-color)] text-[var(--text-dim)] hover:bg-[var(--row-hover)]"
                              }`}
                            >
                              {attached ? t("detachDefault") : t("attachDefault")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!filteredAudiences.length ? (
                    <p className="py-8 text-center text-sm text-[var(--text-dim)]">
                      {!metaConnected ? t("metaRequired") : t("noAudiences")}
                    </p>
                  ) : null}
                  {totalPages > 1 ? (
                    <div
                      className="flex items-center justify-between border-t px-5 py-3"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <p className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                        {filteredAudiences.length} público{filteredAudiences.length === 1 ? "" : "s"}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border px-3 py-1 font-body text-xs disabled:opacity-40"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                        >
                          Anterior
                        </button>
                        <span className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                          {page} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="rounded-lg border px-3 py-1 font-body text-xs disabled:opacity-40"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

            {lookalikeJobs.length ? (
              <div className="border-t border-[var(--border-color)] p-3">
                <div className="text-xs font-semibold text-[var(--text-dim)]">{t("recentJobs")}</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {lookalikeJobs.slice(0, 5).map((j) => (
                    <li key={j.id} className="flex justify-between text-[var(--text-dim)]">
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
    </div>
  );
}
