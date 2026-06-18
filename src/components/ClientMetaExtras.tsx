"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

type Audience = { id: string; name?: string; subtype?: string };

export function ClientMetaExtras({
  clientId,
  defaultAdAccountId
}: {
  clientId: string;
  defaultAdAccountId: string;
}) {
  const t = useTranslations("client");
  const [metaPixelId, setMetaPixelId] = useState("");
  const [metaLeadFormId, setMetaLeadFormId] = useState("");
  const [instagramActorId, setInstagramActorId] = useState("");
  const [defaultCta, setDefaultCta] = useState("LEARN_MORE");
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncPriority, setSyncPriority] = useState("normal");
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [tags, setTags] = useState("");
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [includeAudiences, setIncludeAudiences] = useState<string[]>([]);
  const [lookalikeName, setLookalikeName] = useState("");
  const [lookalikeSeed, setLookalikeSeed] = useState("");
  const [defaultUtmSource, setDefaultUtmSource] = useState("facebook");
  const [defaultUtmMedium, setDefaultUtmMedium] = useState("paid");
  const [defaultUtmCampaign, setDefaultUtmCampaign] = useState("");
  const [defaultUtmContent, setDefaultUtmContent] = useState("");
  const [defaultUtmTerm, setDefaultUtmTerm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`)
      .then((r) => r.json())
      .then((j) => {
        const s = j.settings;
        if (s) {
          setMetaPixelId(s.metaPixelId ?? "");
          setMetaLeadFormId(s.metaLeadFormId ?? "");
          setInstagramActorId(s.instagramActorId ?? "");
          setDefaultCta(s.defaultCta ?? "LEARN_MORE");
          setSyncEnabled(s.syncEnabled !== false);
          setSyncPriority(s.syncPriority ?? "normal");
          setAutomationEnabled(!!s.automationEnabled);
          setIncludeAudiences(s.defaultCustomAudienceIds ?? []);
          const du = s.defaultUtm;
          if (du) {
            setDefaultUtmSource(du.source ?? "facebook");
            setDefaultUtmMedium(du.medium ?? "paid");
            setDefaultUtmCampaign(du.campaign ?? "");
            setDefaultUtmContent(du.content ?? "");
            setDefaultUtmTerm(du.term ?? "");
          }
        }
        setTags((j.tags ?? []).join(", "));
      });
  }, [clientId]);

  useEffect(() => {
    if (!defaultAdAccountId) return;
    fetch(`/api/meta/audiences?adAccountId=${encodeURIComponent(defaultAdAccountId)}`)
      .then((r) => r.json())
      .then((j) => setAudiences(j.audiences ?? []));
  }, [defaultAdAccountId]);

  const saveSettings = () => {
    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/meta-settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metaPixelId: metaPixelId || null,
          metaLeadFormId: metaLeadFormId || null,
          instagramActorId: instagramActorId || null,
          defaultCta,
          syncEnabled,
          syncPriority,
          automationEnabled,
          defaultCustomAudienceIds: includeAudiences,
          defaultUtm: {
            source: defaultUtmSource,
            medium: defaultUtmMedium,
            campaign: defaultUtmCampaign,
            content: defaultUtmContent,
            term: defaultUtmTerm
          },
          tags: tags
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        })
      });
      const j = await res.json();
      setMessage(j.ok ? t("metaExtrasSaved") : j.error);
    });
  };

  const createLookalike = () => {
    if (!defaultAdAccountId || !lookalikeSeed || !lookalikeName) return;
    startTransition(async () => {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/lookalike`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: lookalikeName,
          adAccountId: defaultAdAccountId,
          originAudienceId: lookalikeSeed,
          ratio: 0.01,
          country: "BR"
        })
      });
      const j = await res.json();
      setMessage(j.ok ? t("lookalikeCreated") : j.error);
    });
  };

  return (
    <>
      <div className="ui-card p-4">
        <div className="text-sm font-semibold">{t("metaAdvanced")}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("metaPixelId")} value={metaPixelId} onChange={setMetaPixelId} />
          <Field label={t("metaLeadFormId")} value={metaLeadFormId} onChange={setMetaLeadFormId} />
          <Field label={t("instagramActorId")} value={instagramActorId} onChange={setInstagramActorId} />
          <div>
            <div className="text-xs text-slate-500">{t("defaultCta")}</div>
            <select
              value={defaultCta}
              onChange={(e) => setDefaultCta(e.target.value)}
              className="mt-1 w-full rounded-xl ui-input"
            >
              <option value="LEARN_MORE">LEARN_MORE</option>
              <option value="SIGN_UP">SIGN_UP</option>
              <option value="WHATSAPP_MESSAGE">WHATSAPP_MESSAGE</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("syncPriority")}</div>
            <select
              value={syncPriority}
              onChange={(e) => setSyncPriority(e.target.value)}
              className="mt-1 w-full rounded-xl ui-input"
            >
              <option value="critical">{t("priorityCritical")}</option>
              <option value="normal">{t("priorityNormal")}</option>
              <option value="low">{t("priorityLow")}</option>
            </select>
          </div>
          <Field label={t("tags")} value={tags} onChange={setTags} placeholder="ecommerce, local" />
        </div>
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-medium text-slate-600">{t("defaultUtmTitle")}</div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="utm_source" value={defaultUtmSource} onChange={setDefaultUtmSource} />
            <Field label="utm_medium" value={defaultUtmMedium} onChange={setDefaultUtmMedium} />
            <Field
              label="utm_campaign"
              value={defaultUtmCampaign}
              onChange={setDefaultUtmCampaign}
              placeholder="{{campaign.name}}"
            />
            <Field
              label="utm_content"
              value={defaultUtmContent}
              onChange={setDefaultUtmContent}
              placeholder="{{ad.name}}"
            />
            <Field label="utm_term" value={defaultUtmTerm} onChange={setDefaultUtmTerm} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={syncEnabled}
            onChange={(e) => setSyncEnabled(e.target.checked)}
            className="accent-violet-600"
          />
          {t("syncEnabled")}
        </label>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={automationEnabled}
            onChange={(e) => setAutomationEnabled(e.target.checked)}
            className="accent-violet-600"
          />
          {t("automationEnabled")}
        </label>
        <div className="mt-3 flex justify-end">
          <button
            disabled={isPending}
            onClick={saveSettings}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
          >
            {t("saveMetaAdvanced")}
          </button>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="text-sm font-semibold">{t("audiencesTitle")}</div>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {audiences.map((a) => (
            <label
              key={a.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs"
            >
              <input
                type="checkbox"
                checked={includeAudiences.includes(a.id)}
                onChange={(e) => {
                  setIncludeAudiences((prev) =>
                    e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                  );
                }}
                className="accent-violet-600"
              />
              <span>
                {a.name ?? a.id} <span className="text-slate-500">({a.subtype})</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label={t("lookalikeName")} value={lookalikeName} onChange={setLookalikeName} />
          <div>
            <div className="text-xs text-slate-500">{t("lookalikeSeed")}</div>
            <select
              value={lookalikeSeed}
              onChange={(e) => setLookalikeSeed(e.target.value)}
              className="mt-1 w-full rounded-xl ui-input"
            >
              <option value="">{t("selectAudience")}</option>
              {audiences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name ?? a.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          disabled={isPending || !lookalikeSeed}
          onClick={createLookalike}
          className="mt-3 rounded-xl border border-violet-700 px-3 py-2 text-xs text-violet-300 hover:bg-violet-950"
        >
          {t("createLookalike")}
        </button>
      </div>

      {message ? <div className="text-xs text-slate-500">{message}</div> : null}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl ui-input"
      />
    </div>
  );
}
