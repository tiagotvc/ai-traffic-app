"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, Filter, Plus, RefreshCw, Target, Users, Building2, BarChart2 } from "lucide-react";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { PageFilterBar } from "@/components/layout/PageFilterBar";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { DsInfoBanner, DsPageHeader } from "@/design-system";
import type { SavedAudienceSummary } from "@/components/audiences/create/types";
import { AudienceDetailModal } from "@/components/audiences/AudienceDetailModal";
import { Badge } from "@/components/ui/Badge";
import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { CompactTablePager } from "@/components/ui/CompactTablePager";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
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

function kindCompactBadge(kind: string) {
  if (kind === "lookalike") return "ds-table-compact-badge--success";
  if (kind === "engagement") return "ds-table-compact-badge--accent";
  return "ds-table-compact-badge--neutral";
}

const META_AUDIENCE_GRID =
  "sm:grid-cols-[minmax(0,1.55fr)_minmax(0,0.8fr)_5.25rem_minmax(0,1fr)]";

const META_AUDIENCE_COL_HDR =
  "text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)] whitespace-nowrap";

const META_AUDIENCE_COL_HDR_TYPE = `${META_AUDIENCE_COL_HDR} text-center`;
const META_AUDIENCE_COL_HDR_ACTIONS = `${META_AUDIENCE_COL_HDR} text-left`;

export function AudiencesLookalikeClient({ useUxChrome = false }: { useUxChrome?: boolean } = {}) {
  const t = useTranslations("audiences");
  const tm = useTranslations("audiencesMisc");
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
    <div className={useUxChrome ? "flex min-h-0 flex-1 flex-col gap-5" : "space-y-5"}>
      {useUxChrome ? (
        <OrionTrafficLoadingOverlay
          open={audiencesLoading || isPending}
          title={isPending ? t("metaActionLoading") : t("metaTableLoading")}
          message={isPending ? t("metaActionLoadingHint") : t("metaTableLoadingHint")}
          messageKey={isPending ? "action" : "fetch"}
          ariaLabelledBy="meta-audiences-loading-title"
        />
      ) : null}
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
          <button
            type="button"
            className="ui-btn-accent inline-flex items-center gap-2 px-5 py-2.5 font-heading text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!metaConnected || !adAccountId}
            onClick={openCreateView}
          >
            <Plus size={16} />
            {t("createNewAudience")}
          </button>
          <button
            type="button"
            onClick={() => void loadAudiences(true)}
            disabled={!adAccountId || audiencesLoading}
            className="ui-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-sm"
          >
            <RefreshCw size={14} className={audiencesLoading ? "animate-spin" : ""} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <PageFilterBar className="mt-0">
        <FilterSelectDropdown
          creatorField
          className="ui-filter-panel-field ui-filter-panel-field--client"
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
            creatorField
            className="ui-filter-panel-field ui-filter-panel-field--ad-account"
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
          creatorField
          className="ui-filter-panel-field"
          icon={<Filter size={13} />}
          label={t("tabSaved")}
          placeholder={t("tabSaved")}
          options={[
            { value: "saved", label: t("tabSaved") },
            { value: "excluded", label: t("tabExcluded") },
            { value: "templates", label: t("tabTemplates") }
          ]}
          value={listTab}
          onChange={(v) => setListTab(v as typeof listTab)}
          clearable={false}
        />
        {listTab !== "templates" ? (
          <div className="ui-filter-panel-grid__search">
            <FilterSearchInput
              creatorField
              size="wide"
              className="mt-0 h-9 w-full"
              label={t("searchAudiences")}
              value={search}
              onChange={setSearch}
              placeholder={t("searchAudiences")}
            />
          </div>
        ) : null}
      </PageFilterBar>
      {client && !adAccountId && !accountsLoading ? (
        <p className="text-xs text-amber-700">
          {t("noAdAccount")}{" "}
          <Link href={`/clients/${client.slug}`} className="underline">
            {t("linkAccount")}
          </Link>
        </p>
      ) : null}
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

      {useUxChrome ? (
        <>
          {listTab !== "templates" ? (
            <DsInfoBanner className="px-4 py-2.5 text-xs">
              {tm.rich("listInfoBanner", {
                strong: (chunks) => (
                  <strong className="font-semibold text-[var(--ui-accent)]">{chunks}</strong>
                )
              })}
            </DsInfoBanner>
          ) : null}

          {hubLoading || accountsLoading ? (
            <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-x-hidden pb-3">
              <div className="ui-campaign-table-shell__header">
                <div className="ui-campaign-table-shell__title">
                  <span className="ui-campaign-table-shell__icon">
                    <Users size={14} />
                  </span>
                  <span className="truncate">{t("tabSaved")}</span>
                </div>
              </div>
              <TableSkeleton bare rows={6} columns={["wide", "badge", "text", "select"]} />
            </div>
          ) : !clientSlug || !adAccountId ? (
            <div className="dashboard-kpi-card flex flex-col items-center justify-center gap-3 p-8 text-center !min-h-0">
              <p className="text-sm text-[var(--text-dim)]">{t("selectClientFirst")}</p>
            </div>
          ) : listTab === "templates" ? (
            <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
              <div className="ui-campaign-table-shell__header">
                <div className="ui-campaign-table-shell__title">
                  <span className="ui-campaign-table-shell__icon">
                    <Users size={14} />
                  </span>
                  <span className="truncate">
                    {t("tabTemplates")}{" "}
                    <span className="font-normal text-[var(--text-dimmer)]">({templateGroups.length})</span>
                  </span>
                </div>
              </div>
              {templateGroups.map((g) => (
                <Link
                  key={g.clientSlug}
                  href={`/clients/${g.clientSlug}`}
                  className="flex items-center gap-2.5 border-b border-[var(--creator-card-border)] px-3 py-2 last:border-0 transition-colors hover:bg-[var(--row-hover)]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--ui-accent-muted)]">
                    <Users size={14} className="text-[var(--ui-accent)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--text-main)]">{g.clientName}</p>
                    <p className="truncate text-[10px] text-[var(--text-dim)]">
                      {g.objective} · {t("templateCount", { count: g.templateCount })}
                    </p>
                  </div>
                </Link>
              ))}
              {!templateGroups.length ? (
                <p className="px-3 py-8 text-center text-xs text-[var(--text-dim)]">{t("noTemplates")}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-x-hidden pb-4">
                <div className="ui-campaign-table-shell__header">
                  <div className="ui-campaign-table-shell__title">
                    <span className="ui-campaign-table-shell__icon">
                      <Users size={14} />
                    </span>
                    <span className="truncate">
                      {listTab === "saved" ? t("tabSaved") : t("tabExcluded")}{" "}
                      <span className="font-normal text-[var(--text-dimmer)]">({filteredAudiences.length})</span>
                    </span>
                  </div>
                  <CompactTablePager
                    page={page}
                    pageCount={totalPages}
                    onPageChange={setPage}
                    prevLabel={tm("previous")}
                    nextLabel={tm("next")}
                  />
                </div>

                {audiencesLoading && audiences.length === 0 ? (
                  <TableSkeleton bare rows={6} columns={["wide", "badge", "text", "select"]} />
                ) : (
                  <>
                    <div
                      className={`hidden items-center gap-x-3 border-b border-[var(--creator-card-border)] px-3 py-1.5 sm:grid ${META_AUDIENCE_GRID}`}
                    >
                      <span className={`${META_AUDIENCE_COL_HDR} text-left`}>{t("metaTableColName")}</span>
                      <span className={META_AUDIENCE_COL_HDR_TYPE}>{t("metaTableColType")}</span>
                      <span className={`${META_AUDIENCE_COL_HDR} text-left`}>{t("metaTableColSize")}</span>
                      <span className={META_AUDIENCE_COL_HDR_ACTIONS}>{t("metaTableColActions")}</span>
                    </div>

                    <div className="pb-2.5">
                      {pagedAudiences.map((a) => {
                  const attached = client?.defaultCustomAudienceIds.includes(a.id);
                  const sizeValue =
                    a.approximateCount != null
                      ? `~${a.approximateCount.toLocaleString()}`
                      : a.ratioPct != null
                        ? `${a.ratioPct}%`
                        : "—";
                  return (
                    <div
                      key={`${a.adAccountId}-${a.id}`}
                      className={`grid grid-cols-1 items-center gap-x-3 gap-y-1 border-b border-[var(--creator-card-border)] px-3 py-2.5 last:border-0 hover:bg-[var(--row-hover)] ${META_AUDIENCE_GRID}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[var(--text-main)]">{a.name}</p>
                        <p className="truncate text-[10px] leading-normal text-[var(--text-dimmer)]">{a.sourceLabel}</p>
                      </div>

                      <div className="flex items-center justify-center sm:justify-center">
                        <span className={`ds-table-compact-badge ${kindCompactBadge(a.kind)}`}>
                          {t(`kind.${a.kind}`)}
                        </span>
                      </div>

                      <div className="shrink-0 whitespace-nowrap text-[11px] font-medium tabular-nums text-[var(--text-dim)]">
                        {a.country ?? "BR"} {sizeValue}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center justify-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailAudience(a)}
                          className="ds-table-compact-action ds-table-compact-action--outline"
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
                            className={`ds-table-compact-action ds-table-compact-action--outline ${
                              attached ? "ds-table-compact-action--outline-active" : ""
                            }`}
                          >
                            <Target size={12} />
                            {attached ? t("detachDefault") : t("attachDefault")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                      {!filteredAudiences.length && !(audiencesLoading && audiences.length === 0) ? (
                        <p className="px-3 py-8 text-center text-xs text-[var(--text-dim)]">
                          {!metaConnected ? t("metaRequired") : t("noAudiences")}
                        </p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              {lookalikeJobs.length ? (
                <div className="campaign-creator-card campaign-creator-card--compact px-3 py-2.5">
                  <p className="campaign-creator-orion-section-label mb-2">{t("recentJobs")}</p>
                  <ul className="space-y-1">
                    {lookalikeJobs.slice(0, 5).map((j) => (
                      <li key={j.id} className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-dim)]">
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
            </>
          )}
        </>
      ) : (
      <div className="space-y-4">
          <div className="ui-card p-4">{selectors}</div>

          {listTab !== "templates" ? (
            <DsInfoBanner className="px-4 py-2.5 text-sm">
              {tm.rich("listInfoBanner", {
                strong: (chunks) => (
                  <strong className="font-semibold text-[var(--ui-accent)]">{chunks}</strong>
                )
              })}
            </DsInfoBanner>
          ) : null}

          <div
            className="overflow-hidden rounded-xl border"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
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

            {listTab !== "templates" ? (
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
              <div className="space-y-2 p-3">
                  {templateGroups.map((g) => (
                    <Link
                      key={g.clientSlug}
                      href={`/clients/${g.clientSlug}`}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] p-3 hover:bg-[var(--row-hover)]"
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
                <div className="space-y-2">
                  {pagedAudiences.map((a) => {
                    const attached = client?.defaultCustomAudienceIds.includes(a.id);
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
                        {tm("audienceCount", { count: filteredAudiences.length })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className="ui-btn-secondary px-3 py-1 text-xs disabled:opacity-40"
                        >
                          {tm("previous")}
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
                          {tm("next")}
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
      )}
    </div>
  );
}
