"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { FormField } from "@/components/ui/FormField";
import { MetaTargetingSelect, type TargetingItem } from "@/components/MetaTargetingSelect";

type Asset = { id: string; label: string; url?: string | null };
type AdAccountOption = { metaAdAccountId: string; label: string };
type ClientOption = { id: string; slug: string; name: string };
type AssetPage = { metaPageId: string; name: string };
type IgAccount = { id: string; username: string };
type Pixel = { id: string; name: string };

export type AdsCreatorFooterState = {
  publish: () => void;
  publishDisabled: boolean;
  isPending: boolean;
};

export function AdsCreatorClient({
  initialClientSlug,
  embedded = false,
  onPublished,
  onFooterState
}: {
  initialClientSlug?: string;
  embedded?: boolean;
  onPublished?: () => void;
  /** When embedded, reports publish action for a fixed footer in the parent drawer. */
  onFooterState?: (state: AdsCreatorFooterState) => void;
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
  const [pages, setPages] = useState<AssetPage[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<IgAccount[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedInstagramId, setSelectedInstagramId] = useState("");
  const [selectedPixelId, setSelectedPixelId] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [publishConfigError, setPublishConfigError] = useState(false);

  // Público (segmentação)
  const [locations, setLocations] = useState<TargetingItem[]>([]);
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [interests, setInterests] = useState<TargetingItem[]>([]);
  const [locales, setLocales] = useState<TargetingItem[]>([]);
  const [audiences, setAudiences] = useState<{ id: string; name: string }[]>([]);
  const [includeAud, setIncludeAud] = useState<string[]>([]);
  const [excludeAud, setExcludeAud] = useState<string[]>([]);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const loadAssets = useCallback(async (accountId: string) => {
    const qs = accountId ? `?adAccountId=${encodeURIComponent(accountId)}` : "";
    const res = await fetch(`/api/meta/assets${qs}`);
    const j = (await res.json()) as {
      assets?: Asset[];
      pages?: AssetPage[];
      instagramAccounts?: IgAccount[];
      pixels?: Pixel[];
    };
    setAssets(j.assets ?? []);
    const pg = j.pages ?? [];
    const ig = j.instagramAccounts ?? [];
    const px = j.pixels ?? [];
    setPages(pg);
    setInstagramAccounts(ig);
    setPixels(px);
    // Só mostramos seletor quando há mais de uma opção; com uma só, já seleciona.
    setSelectedPageId(pg.length === 1 ? pg[0].metaPageId : "");
    setSelectedInstagramId(ig.length === 1 ? ig[0].id : "");
    setSelectedPixelId(px.length === 1 ? px[0].id : "");

    // Públicos personalizados/lookalike desta conta de anúncio.
    if (accountId) {
      try {
        const aud = await fetch(`/api/meta/audiences?adAccountId=${encodeURIComponent(accountId)}`).then(
          (r) => r.json()
        );
        setAudiences(
          ((aud.audiences ?? []) as Array<{ id: string; name?: string }>).map((a) => ({
            id: a.id,
            name: a.name?.trim() || a.id
          }))
        );
      } catch {
        setAudiences([]);
      }
    } else {
      setAudiences([]);
    }
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
        const [accountsRes, publishRes, settingsRes] = await Promise.all([
          fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(slug)}`),
          fetch(`/api/clients/${encodeURIComponent(slug)}/publish-config`),
          fetch(`/api/clients/${encodeURIComponent(slug)}/meta-settings`)
        ]);

        const accountsJson = (await accountsRes.json()) as {
          ok?: boolean;
          accounts?: AdAccountOption[];
          defaultAdAccountId?: string | null;
          error?: string;
        };
        const publishJson = (await publishRes.json()) as {
          resolved?: { ready?: boolean; linkUrl?: string | null };
        };

        setPublishReady(!!publishJson.resolved?.ready);
        setLinkUrl(publishJson.resolved?.linkUrl ?? "");

        // Pré-preenche o Público com os defaults do cliente (países, idade, públicos).
        try {
          const sj = (await settingsRes.json()) as {
            settings?: {
              targeting?: { countries?: string[]; age_min?: number; age_max?: number };
              defaultCustomAudienceIds?: string[];
              defaultExcludedAudienceIds?: string[];
            };
          };
          const s = sj.settings;
          const countries = s?.targeting?.countries ?? [];
          setLocations(
            countries.map((code) => ({
              value: code,
              label: regionNames?.of(code) ?? code,
              meta: { type: "country", countryCode: code }
            }))
          );
          if (s?.targeting?.age_min) setAgeMin(String(s.targeting.age_min));
          if (s?.targeting?.age_max) setAgeMax(String(s.targeting.age_max));
          setIncludeAud(s?.defaultCustomAudienceIds ?? []);
          setExcludeAud(s?.defaultExcludedAudienceIds ?? []);
          setInterests([]);
          setLocales([]);
          setGender("all");
        } catch {
          /* mantém o que estiver */
        }

        if (!accountsRes.ok || !accountsJson.ok) {
          setAdAccountId("");
          setAccounts([]);
          setAssets([]);
          setMessage(accountsJson.error ?? t("adAccountsLoadFailed"));
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
        setAdAccountId("");
        setAccounts([]);
        setAssets([]);
        setMessage(t("adAccountsLoadFailed"));
      } finally {
        setAccountsLoading(false);
      }
    },
    [loadAssets, t, regionNames]
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

  const handlePublish = useCallback(() => {
    setMessage(null);
    setPublishConfigError(false);

    const countries = locations
      .filter((l) => l.meta?.type === "country")
      .map((l) => l.meta?.countryCode || l.value);
    const cities = locations
      .filter((l) => l.meta?.type && l.meta.type !== "country")
      .map((l) => ({ key: l.value }));
    const targeting = {
      countries: countries.length ? countries : undefined,
      cities: cities.length ? cities : undefined,
      ageMin: Number(ageMin) || undefined,
      ageMax: Number(ageMax) || undefined,
      genders: gender === "male" ? [1] : gender === "female" ? [2] : undefined,
      locales: locales.length ? locales.map((l) => Number(l.value)).filter(Boolean) : undefined,
      interests: interests.length ? interests.map((i) => ({ id: i.value, name: i.label })) : undefined,
      customAudienceIds: includeAud.length ? includeAud : undefined,
      excludedAudienceIds: excludeAud.length ? excludeAud : undefined
    };

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
          assetIds: selectedIds,
          metaPageId: selectedPageId || undefined,
          metaLinkUrl: linkUrl.trim() || undefined,
          metaPixelId: selectedPixelId || undefined,
          instagramActorId: selectedInstagramId || undefined,
          targeting
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
  }, [
    adAccountId,
    campaignName,
    clientSlug,
    dailyBudget,
    descriptions,
    objective,
    onPublished,
    selectedIds,
    selectedPageId,
    selectedInstagramId,
    selectedPixelId,
    linkUrl,
    locations,
    ageMin,
    ageMax,
    gender,
    locales,
    interests,
    includeAud,
    excludeAud,
    t,
    titles
  ]);

  // Publicação habilitada quando o cliente já tem página+URL OU quando o usuário
  // escolheu página + URL de destino aqui na criação do anúncio.
  const hasPublishTarget = publishReady || (!!selectedPageId && !!linkUrl.trim());
  const publishDisabled =
    isPending || selectedIds.length === 0 || !adAccountId || !clientSlug || !hasPublishTarget;

  useEffect(() => {
    if (!embedded || !onFooterState) return;
    onFooterState({ publish: handlePublish, publishDisabled, isPending });
  }, [embedded, onFooterState, handlePublish, publishDisabled, isPending]);

  const adAccountsErrorBlock =
    message && !accountsLoading && accounts.length === 0 ? (
      <div className="ui-alert-warning space-y-2">
        <p>{message}</p>
        <p className="text-xs">
          <Link href="/settings" className="font-medium text-violet-700 underline">
            {t("adAccountsSettingsLink")}
          </Link>
          {clientSlug ? (
            <>
              {" · "}
              <Link href={`/clients/${clientSlug}`} className="font-medium text-violet-700 underline">
                {t("adAccountsClientLink")}
              </Link>
            </>
          ) : null}
        </p>
      </div>
    ) : null;

  const formFields = (
    <>
      {clientSlug && !hasPublishTarget ? (
        <div className="ui-alert-warning">
          {t("publishNotReady")}{" "}
          <Link href={`/clients/${clientSlug}`} className="font-medium underline">
            {t("configurePublish")}
          </Link>
        </div>
      ) : null}

      {message && !(embedded && !accountsLoading && accounts.length === 0) ? (
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

      {adAccountsErrorBlock}

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

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("publishTarget")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("publishTargetHint")}</p>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {pages.length > 1 ? (
            <FormField label={t("page")}>
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="ui-select"
              >
                <option value="">{t("selectPage")}</option>
                {pages.map((p) => (
                  <option key={p.metaPageId} value={p.metaPageId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          {instagramAccounts.length > 1 ? (
            <FormField label={t("instagram")}>
              <select
                value={selectedInstagramId}
                onChange={(e) => setSelectedInstagramId(e.target.value)}
                className="ui-select"
              >
                <option value="">{t("instagramNone")}</option>
                {instagramAccounts.map((i) => (
                  <option key={i.id} value={i.id}>
                    @{i.username}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          {pixels.length > 1 ? (
            <FormField label={t("pixel")}>
              <select
                value={selectedPixelId}
                onChange={(e) => setSelectedPixelId(e.target.value)}
                className="ui-select"
              >
                <option value="">{t("pixelNone")}</option>
                {pixels.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}

          <FormField label={t("destinationUrl")}>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="ui-input"
            />
          </FormField>
        </div>
      </div>

      <FormField label={t("dailyBudget")}>
        <input
          value={dailyBudget}
          onChange={(e) => setDailyBudget(e.target.value)}
          className="ui-input"
        />
      </FormField>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <h2 className="text-sm font-semibold text-slate-900">{t("audienceTitle")}</h2>
        <p className="mt-1 text-xs text-slate-500">{t("audienceHint")}</p>

        <div className="mt-3 grid grid-cols-1 gap-4">
          <FormField label={t("locations")}>
            <MetaTargetingSelect
              type="geo"
              placeholder={t("locationsPlaceholder")}
              selected={locations}
              onAdd={(item) => setLocations((prev) => [...prev, item])}
              onRemove={(value) => setLocations((prev) => prev.filter((p) => p.value !== value))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField label={t("ageMin")}>
              <input
                type="number"
                min={13}
                max={65}
                value={ageMin}
                onChange={(e) => setAgeMin(e.target.value)}
                className="ui-input"
              />
            </FormField>
            <FormField label={t("ageMax")}>
              <input
                type="number"
                min={13}
                max={65}
                value={ageMax}
                onChange={(e) => setAgeMax(e.target.value)}
                className="ui-input"
              />
            </FormField>
            <FormField label={t("gender")}>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                className="ui-select"
              >
                <option value="all">{t("genderAll")}</option>
                <option value="male">{t("genderMale")}</option>
                <option value="female">{t("genderFemale")}</option>
              </select>
            </FormField>
          </div>

          <FormField label={t("interests")}>
            <MetaTargetingSelect
              type="interest"
              placeholder={t("interestsPlaceholder")}
              selected={interests}
              onAdd={(item) => setInterests((prev) => [...prev, item])}
              onRemove={(value) => setInterests((prev) => prev.filter((p) => p.value !== value))}
            />
          </FormField>

          <FormField label={t("languages")}>
            <MetaTargetingSelect
              type="locale"
              placeholder={t("languagesPlaceholder")}
              selected={locales}
              onAdd={(item) => setLocales((prev) => [...prev, item])}
              onRemove={(value) => setLocales((prev) => prev.filter((p) => p.value !== value))}
            />
          </FormField>

          {audiences.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label={t("audienceInclude")}>
                <select
                  multiple
                  value={includeAud}
                  onChange={(e) =>
                    setIncludeAud(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                  className="ui-select h-28"
                >
                  {audiences.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("audienceExclude")}>
                <select
                  multiple
                  value={excludeAud}
                  onChange={(e) =>
                    setExcludeAud(Array.from(e.target.selectedOptions, (o) => o.value))
                  }
                  className="ui-select h-28"
                >
                  {audiences.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          ) : null}
        </div>
      </div>

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
    return <div className="space-y-4">{formFields}</div>;
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
