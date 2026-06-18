"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { AiAudienceWizard } from "@/components/audiences/create/AiAudienceWizard";
import { CreateAudienceHub } from "@/components/audiences/create/CreateAudienceHub";
import { EngagementAudienceWizard } from "@/components/audiences/create/EngagementAudienceWizard";
import { LookalikeAudienceWizard } from "@/components/audiences/create/LookalikeAudienceWizard";
import { AppAudiencePanel, CustomerListPanel } from "@/components/audiences/create/ReadOnlyPanels";
import { CombineAudienceWizard, SavedAudienceWizard } from "@/components/audiences/create/SavedCombineWizards";
import { TosBanner } from "@/components/audiences/create/TosBanner";
import type { AudienceCreateContext, CreateAudienceType, SavedAudienceSummary } from "@/components/audiences/create/types";
import { WebsiteAudienceWizard } from "@/components/audiences/create/WebsiteAudienceWizard";
import { AudienceDetailModal } from "@/components/audiences/AudienceDetailModal";
import { Badge } from "@/components/ui/Badge";
import { OutlineIcon } from "@/components/ui/OutlineIcon";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Link } from "@/i18n/navigation";

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

export function AudiencesLookalikeClient() {
  const t = useTranslations("audiences");
  const [isPending, startTransition] = useTransition();

  const [view, setView] = useState<"list" | "create">("list");
  const [createType, setCreateType] = useState<CreateAudienceType | null>(null);
  const [tosBlocked, setTosBlocked] = useState(false);
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
  const [detailAudience, setDetailAudience] = useState<SavedAudienceSummary | null>(null);
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
        const qs = new URLSearchParams({ clientId: clientSlug, adAccountId });
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
        <span className="shrink-0 text-xs font-medium text-slate-500">{t("selectClient")}</span>
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
          <span className="shrink-0 text-xs font-medium text-slate-500">{t("selectAdAccount")}</span>
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

  const renderCreateWizard = () => {
    if (!createCtx) return <p className="text-sm text-slate-500">{t("selectClientFirst")}</p>;
    const backToHub = () => setCreateType(null);
    const backToList = () => {
      setCreateType(null);
      setView("list");
    };

    if (!createType) {
      return (
        <CreateAudienceHub
          disabled={tosBlocked}
          onSelect={(type) => {
            setCreateType(type);
            setError(null);
            setMessage(null);
          }}
        />
      );
    }

    const wizardProps = { ctx: createCtx, onBack: backToHub };
    switch (createType) {
      case "website":
        return <WebsiteAudienceWizard {...wizardProps} />;
      case "engagement":
        return <EngagementAudienceWizard {...wizardProps} />;
      case "lookalike":
        return <LookalikeAudienceWizard {...wizardProps} />;
      case "customer_list":
        return <CustomerListPanel {...wizardProps} />;
      case "app":
        return <AppAudiencePanel {...wizardProps} />;
      case "saved":
        return <SavedAudienceWizard {...wizardProps} />;
      case "combine":
        return <CombineAudienceWizard {...wizardProps} />;
      case "ai":
        return <AiAudienceWizard {...wizardProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <AudienceDetailModal
        open={!!detailAudience}
        onClose={() => setDetailAudience(null)}
        summary={detailAudience}
        clientSlug={clientSlug}
        adAccountId={adAccountId}
      />
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
                setCreateType(null);
              }}
              disabled={!metaConnected || !adAccountId}
              className="ui-btn-primary text-sm"
            >
              {t("createNewAudience")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setView("list");
                setCreateType(null);
              }}
              className="ui-btn-secondary text-sm"
            >
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
                        <div className="flex items-start justify-between gap-3">
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
                          <div className="shrink-0 text-right text-[10px] text-slate-400">
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
                            className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
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
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
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
          {adAccountId ? (
            <TosBanner clientSlug={clientSlug} adAccountId={adAccountId} onBlocked={setTosBlocked} />
          ) : null}
          <div className="ui-card p-5">{renderCreateWizard()}</div>
        </div>
      )}
    </div>
  );
}
