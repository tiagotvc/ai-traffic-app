"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, Filter, Info, Plus, RefreshCw, Search, Target, Users, Building2, BarChart2 } from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { DsButton, DsPageHeader } from "@/design-system";
import type { SavedAudienceSummary } from "@/components/audiences/create/types";
import { AudienceDetailModal } from "@/components/audiences/AudienceDetailModal";
import { Badge } from "@/components/ui/Badge";
import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { formatMetaGraphErrorMessage } from "@/lib/meta-graph-errors";

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
        background: "var(--ui-accent-hover)",
        borderColor: "var(--ui-accent-ring)",
        color: "var(--text-dim)"
      }}
    >
      <Info size={16} className="mt-0.5 shrink-0" style={{ color: "var(--ui-accent)" }} />
      <span>
        Públicos sincronizados diretamente da Meta. Criativos com menos de{" "}
        <strong style={{ color: "var(--ui-accent)" }}>100 impressões</strong> no período não entram na classificação.
        Mantenha seus públicos organizados para facilitar o uso em novas campanhas.
      </span>
    </div>
  );
}

export function AudiencesLookalikeClient({ useUxChrome = false }: { useUxChrome?: boolean } = {}) {
  const t = useTranslations("audiences");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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
    router.push("/audiences/meta/create");
  }, [router]);

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
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelectDropdown
        icon={<Building2 size={14} />}
        label={t("selectClient")}
        placeholder={t("selectClient")}
        value={clientSlug}
        onChange={setClientSlug}
        disabled={hubLoading}
        clearable={false}
        options={clients.map((c) => ({ value: c.slug, label: c.name }))}
      />
      {accounts.length > 1 ? (
        <FilterSelectDropdown
          icon={<BarChart2 size={14} />}
          label={t("selectAdAccount")}
          placeholder={t("selectAdAccount")}
          value={adAccountId}
          onChange={setAdAccountId}
          disabled={accountsLoading}
          clearable={false}
          options={accounts.map((a) => ({ value: a.metaAdAccountId, label: a.label }))}
        />
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
      <AudienceDetailModal
        open={!!detailAudience}
        onClose={() => setDetailAudience(null)}
        summary={detailAudience}
        clientSlug={clientSlug}
        adAccountId={adAccountId}
      />
      {useUxChrome ? (
      <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitleBlock
          title={t("metaAudiencesTitle")}
          subtitle={t("metaFeatureHint")}
          titleIcon={<Users size={16} aria-hidden />}
          badge={
            <span
              className="rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--ui-accent-muted)",
                color: "var(--ui-accent)",
                border: "1px solid var(--ui-accent-border)"
              }}
            >
              {t("metaFeatureBadge")}
            </span>
          }
        />
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DsButton
            variant="accent"
            size="sm"
            className="inline-flex items-center gap-2"
            disabled={!metaConnected || !adAccountId}
            onClick={openCreateView}
          >
            <Plus size={16} />
            {t("createNewAudience")}
          </DsButton>
          <button
            type="button"
            onClick={() => void loadAudiences(true)}
            disabled={!adAccountId || audiencesLoading}
            className="ui-btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={14} className={audiencesLoading ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelectDropdown
          icon={<Building2 size={14} />}
          label={t("selectClient")}
          placeholder={t("selectClient")}
          value={clientSlug}
          onChange={setClientSlug}
          disabled={hubLoading}
          clearable={false}
          options={clients.map((c) => ({ value: c.slug, label: c.name }))}
        />
        {accounts.length > 1 ? (
          <FilterSelectDropdown
            icon={<BarChart2 size={14} />}
            label={t("selectAdAccount")}
            placeholder={t("selectAdAccount")}
            value={adAccountId}
            onChange={setAdAccountId}
            disabled={accountsLoading}
            clearable={false}
            options={accounts.map((a) => ({ value: a.metaAdAccountId, label: a.label }))}
          />
        ) : null}
        <FilterSelectDropdown
          icon={<Filter size={13} />}
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
        {listTab !== "templates" ? (
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dimmer)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchAudiences")}
              className="ui-input h-9 w-full pl-9 text-sm"
            />
          </div>
        ) : null}
      </div>
      </>
      ) : null}

      {!useUxChrome ? (
      <DsPageHeader
        breadcrumbs={t("breadcrumbList")}
        title={t("title")}
        subtitle={t("subtitle")}
        titleIcon={<Target size={16} />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateView}
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
      ) : null}

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
                      ? "border-b-2 border-[var(--ui-accent)] text-[var(--ui-accent)]"
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
                        style={{ background: "var(--ui-accent-muted)" }}
                      >
                        <Users size={16} style={{ color: "var(--ui-accent)" }} />
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
                <div className={useUxChrome ? "space-y-3 p-1" : "space-y-2"}>
                  {pagedAudiences.map((a) => {
                    const attached = client?.defaultCustomAudienceIds.includes(a.id);
                    if (useUxChrome) {
                      const kindColor =
                        a.kind === "lookalike"
                          ? { bg: "rgba(16,185,129,0.12)", color: "#10b981" }
                          : a.kind === "engagement"
                            ? { bg: "rgba(245,166,35,0.13)", color: "#f59e0b" }
                            : { bg: "rgba(79,70,229,0.12)", color: "#818cf8" };
                      return (
                        <article
                          key={`${a.adAccountId}-${a.id}`}
                          className="campaign-creator-card flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-[var(--row-hover)]"
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
                                  borderColor: attached ? "var(--ui-accent-border)" : "var(--border-color)",
                                  color: attached ? "var(--ui-accent)" : "var(--text-dim)",
                                  background: attached ? "var(--ui-accent-hover)" : "transparent"
                                }}
                              >
                                <Target size={12} />
                                {attached ? t("detachDefault") : t("attachDefault")}
                              </button>
                            ) : null}
                          </div>
                        </article>
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
                                  ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-hover)] text-[var(--ui-accent)]"
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
                    <div className="campaign-creator-card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <p className="font-body text-xs text-[var(--text-dimmer)]">
                        {t("audienceCount", { count: filteredAudiences.length })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                        >
                          {t("previous")}
                        </button>
                        <span className="font-body text-xs text-[var(--text-dim)]">
                          {page} / {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                        >
                          {t("next")}
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
