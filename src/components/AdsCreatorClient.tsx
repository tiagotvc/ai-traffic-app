"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { FormField } from "@/components/ui/FormField";

type Asset = { id: string; label: string; url?: string | null };
type AdAccountOption = { metaAdAccountId: string; label: string };
type ClientOption = { id: string; slug: string; name: string };

export function AdsCreatorClient({
  initialClientSlug,
  embedded = false,
  onPublished
}: {
  initialClientSlug?: string;
  embedded?: boolean;
  onPublished?: () => void;
}) {
  const t = useTranslations("ads");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientSlug, setClientSlug] = useState(initialClientSlug ?? "");
  const [publishReady, setPublishReady] = useState(false);
  const [accounts, setAccounts] = useState<AdAccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [campaignName, setCampaignName] = useState(
    locale === "en" ? "Traffic AI — Campaign" : "Traffic AI — Campanha"
  );
  const [titles, setTitles] = useState(
    locale === "en"
      ? "Perfect smile in 30 days\nDental implants — free evaluation\nBook now"
      : "Sorriso perfeito em 30 dias\nImplantes com avaliação\nAgende agora"
  );
  const [descriptions, setDescriptions] = useState(
    locale === "en"
      ? "Special offer for first visit.\nExpert team and human care.\nChat with us on WhatsApp."
      : "Condições especiais para primeira consulta.\nEquipe especialista.\nFale no WhatsApp."
  );
  const [dailyBudget, setDailyBudget] = useState("150");
  const [objective, setObjective] = useState<"leads" | "sales" | "traffic">("leads");
  const [adAccountId, setAdAccountId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [publishConfigError, setPublishConfigError] = useState(false);

  const loadAssets = useCallback(async (accountId: string) => {
    const qs = accountId ? `?adAccountId=${encodeURIComponent(accountId)}` : "";
    const res = await fetch(`/api/meta/assets${qs}`);
    const j = (await res.json()) as {
      assets?: Asset[];
      adAccountId?: string | null;
      accounts?: AdAccountOption[];
    };
    if (j.accounts?.length) setAccounts(j.accounts);
    if (j.adAccountId) setAdAccountId(j.adAccountId);
    setAssets(j.assets ?? []);
  }, []);

  const loadForClient = useCallback(
    async (slug: string) => {
      if (!slug) {
        setAccounts([]);
        setAdAccountId("");
        setPublishReady(false);
        setAssets([]);
        return;
      }

      setAccountsLoading(true);
      setMessage(null);
      setPublishConfigError(false);

      try {
        const [accountsRes, publishRes] = await Promise.all([
          fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(slug)}`),
          fetch(`/api/clients/${encodeURIComponent(slug)}/publish-config`)
        ]);

        const accountsJson = (await accountsRes.json()) as {
          ok?: boolean;
          accounts?: AdAccountOption[];
          defaultAdAccountId?: string | null;
          error?: string;
        };
        const publishJson = (await publishRes.json()) as { resolved?: { ready?: boolean } };

        setPublishReady(!!publishJson.resolved?.ready);

        if (!accountsRes.ok || !accountsJson.ok) {
          setMessage(accountsJson.error ?? t("adAccountsLoadFailed"));
          setAccounts([]);
          return;
        }

        const list = accountsJson.accounts ?? [];
        setAccounts(list);
        const first = accountsJson.defaultAdAccountId ?? list[0]?.metaAdAccountId ?? "";
        if (first) {
          setAdAccountId(first);
          await loadAssets(first);
        } else {
          setMessage(t("adAccountsEmpty"));
          await loadAssets("");
        }
      } catch {
        setMessage(t("adAccountsLoadFailed"));
      } finally {
        setAccountsLoading(false);
      }
    },
    [loadAssets, t]
  );

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((j: { clients?: ClientOption[] }) => {
        const list = j.clients ?? [];
        setClients(list);
        if (!clientSlug && list[0]?.slug) {
          setClientSlug(list[0].slug);
        }
      })
      .catch(() => {});
  }, [clientSlug]);

  useEffect(() => {
    if (clientSlug) void loadForClient(clientSlug);
  }, [clientSlug, loadForClient]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const handlePublish = () => {
    setMessage(null);
    setPublishConfigError(false);
    startTransition(async () => {
      const res = await fetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientSlug,
          campaignName,
          adAccountId,
          objective,
          dailyBudget: Number(dailyBudget),
          titles: titles.split("\n").map((s) => s.trim()).filter(Boolean),
          descriptions: descriptions.split("\n").map((s) => s.trim()).filter(Boolean),
          assetIds: selectedIds
        })
      });
      const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok || !json?.ok) {
        if (json?.error === "CLIENT_PUBLISH_CONFIG_REQUIRED") {
          setPublishConfigError(true);
          setMessage(String(json.message ?? t("missingPage")));
          return;
        }
        setMessage(String(json?.error ?? t("createFailed")));
        return;
      }
      setMessage(
        t("success", {
          campaignId: String(json.campaignId ?? "—"),
          adsetId: String(json.adsetId ?? "—"),
          adId: String(json.adId ?? "—")
        })
      );
      onPublished?.();
    });
  };

  const publishDisabled =
    isPending || selectedIds.length === 0 || !adAccountId || !clientSlug || !publishReady;

  const formFields = (
    <>
      {clientSlug && !publishReady ? (
        <div className="ui-alert-warning">
          {t("publishNotReady")}{" "}
          <Link href={`/clients/${clientSlug}`} className="font-medium underline">
            {t("configurePublish")}
          </Link>
        </div>
      ) : null}

      {message ? (
        <div className={publishConfigError ? "ui-alert-warning" : "ui-alert-info"}>
          {message}
          {publishConfigError && clientSlug ? (
            <>
              {" "}
              <Link href={`/clients/${clientSlug}`} className="font-medium underline">
                {t("configurePublish")}
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {embedded ? (
        <p className="rounded-lg bg-violet-50 px-3 py-2 text-[11px] text-violet-800">{t("hierarchyHint")}</p>
      ) : null}

      <FormField label={t("clientLabel")}>
        {clients.length > 0 ? (
          <select
            value={clientSlug}
            onChange={(e) => setClientSlug(e.target.value)}
            className="ui-select"
          >
            <option value="">{t("selectClient")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="ui-alert-warning">{t("noClients")}</div>
        )}
      </FormField>

      <FormField label={t("campaignName")}>
        <input
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="ui-input"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t("adAccount")}>
          {accountsLoading ? (
            <div className="ui-input text-slate-400">{tCommon("loading")}</div>
          ) : accounts.length > 0 ? (
            <select
              value={adAccountId}
              onChange={(e) => {
                const next = e.target.value;
                setAdAccountId(next);
                void loadAssets(next);
              }}
              className="ui-select"
            >
              {accounts.map((a) => (
                <option key={a.metaAdAccountId} value={a.metaAdAccountId}>
                  {a.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="ui-alert-warning">{t("adAccountsEmpty")}</div>
          )}
        </FormField>

        <FormField label={t("objective")}>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value as typeof objective)}
            className="ui-select"
          >
            <option value="leads">{t("objectiveLeads")}</option>
            <option value="sales">{t("objectiveSales")}</option>
            <option value="traffic">{t("objectiveTraffic")}</option>
          </select>
        </FormField>
      </div>

      <FormField label={t("dailyBudget")}>
        <input
          value={dailyBudget}
          onChange={(e) => setDailyBudget(e.target.value)}
          className="ui-input"
        />
      </FormField>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("dynamicCreatives")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("dynamicHint")}</p>
        <div className="mt-3 grid grid-cols-1 gap-4">
          <FormField label={t("titles")}>
            <textarea
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
              className="ui-textarea"
              rows={embedded ? 4 : 6}
            />
          </FormField>
          <FormField label={t("descriptions")}>
            <textarea
              value={descriptions}
              onChange={(e) => setDescriptions(e.target.value)}
              className="ui-textarea"
              rows={embedded ? 4 : 6}
            />
          </FormField>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("media")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("mediaHint")}</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {assets.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm transition hover:border-violet-300"
            >
              <input
                type="checkbox"
                checked={!!selected[a.id]}
                onChange={(e) => setSelected((p) => ({ ...p, [a.id]: e.target.checked }))}
                className="accent-violet-600"
              />
              <span className="text-xs text-slate-700">{a.label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{t("selected", { count: selectedIds.length })}</p>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4 pb-4">
        {formFields}
        <button
          type="button"
          disabled={publishDisabled}
          onClick={handlePublish}
          className="ui-btn-primary sticky bottom-0 w-full disabled:opacity-60"
        >
          {isPending ? tCommon("sending") : t("publishCampaign")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{t("breadcrumb")}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={publishDisabled}
          onClick={handlePublish}
          className="ui-btn-primary shrink-0 disabled:opacity-60"
        >
          {isPending ? tCommon("sending") : tCommon("publish")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="ui-card space-y-4 p-5 xl:col-span-2">{formFields}</section>

        <aside className="ui-card p-5">
          <h2 className="text-sm font-semibold text-slate-900">{t("preview")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("previewHint")}</p>
          <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <p className="px-4 text-center text-xs text-slate-400">{t("previewPlaceholder")}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
