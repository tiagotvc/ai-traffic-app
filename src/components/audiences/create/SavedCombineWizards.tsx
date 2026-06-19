"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { AiAudienceTargetingForm } from "./AiAudienceTargetingForm";
import type { AudienceCreateContext } from "./types";

type SavedItem = {
  id: string;
  name: string;
  targeting: Record<string, unknown>;
};

type Props = {
  ctx: AudienceCreateContext;
  onBack: () => void;
};

function summarizeTargeting(targeting: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const geo = targeting.geo_locations as { countries?: string[]; cities?: Array<{ name: string }> } | undefined;
  if (geo?.countries?.length) lines.push(`Países: ${geo.countries.join(", ")}`);
  if (geo?.cities?.length) lines.push(`Cidades: ${geo.cities.map((c) => c.name).join(", ")}`);
  if (targeting.age_min || targeting.age_max) {
    lines.push(`Idade: ${targeting.age_min ?? 18}–${targeting.age_max ?? 65}`);
  }
  const genders = targeting.genders as number[] | undefined;
  if (genders?.length === 1) lines.push(genders[0] === 1 ? "Homens" : "Mulheres");
  const flex = targeting.flexible_spec as Array<Record<string, unknown>> | undefined;
  if (flex?.length) lines.push(`${flex.length} grupo(s) de interesses/comportamentos`);
  const custom = targeting.custom_audiences as Array<{ id: string; name?: string }> | undefined;
  if (custom?.length) lines.push(`${custom.length} público(s) personalizado(s) incluído(s)`);
  return lines.length ? lines : ["Targeting copiado do modelo"];
}

function SavedAudienceCopySection({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const qs = new URLSearchParams({
      clientId: ctx.clientSlug,
      adAccountId: ctx.adAccountId
    });
    fetch(`/api/meta/saved-audiences?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setItems(j.audiences ?? []);
          setTemplateId(j.audiences?.[0]?.id ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [ctx]);

  const selected = items.find((i) => i.id === templateId);

  const submit = () => {
    if (!templateId) return;
    startTransition(async () => {
      const res = await fetch("/api/meta/saved-audiences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          name: name.trim() || `${selected?.name ?? "Público"} (cópia)`,
          templateAudienceId: templateId
        })
      });
      const j = await res.json();
      if (j.ok) {
        ctx.onSuccess(t("savedAudienceCreated"));
        ctx.onRefresh();
        onBack();
      } else {
        ctx.onError(j.error ?? t("createdFailed"));
      }
    });
  };

  if (loading) return <p className="text-sm text-slate-500">{t("loadingOptions")}</p>;
  if (items.length === 0) return <p className="text-sm text-slate-500">{t("noSavedAudiences")}</p>;

  return (
    <div className="mt-3 space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500">{t("selectSavedTemplate")}</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="ui-select mt-1 w-full"
        >
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">{t("targetingPreview")}</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-700">
            {summarizeTargeting(selected.targeting).map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label className="text-xs font-medium text-slate-500">{t("audienceName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={selected ? `${selected.name} (cópia)` : ""}
          className="ui-input mt-1 w-full text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={pending || !templateId} onClick={submit} className="ui-btn-secondary text-sm">
          {pending ? t("creating") : t("createSavedAudience")}
        </button>
      </div>
    </div>
  );
}

export function SavedAudienceWizard({ ctx, onBack }: Props) {
  const tAudiences = useTranslations("audiences");
  const tCreator = useTranslations("campaignCreator");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState<"all" | "male" | "female">("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{tAudiences("createType.saved.title")}</h2>
          <p className="mt-1 text-xs text-slate-500">{tAudiences("createType.saved.desc")}</p>
        </div>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {tAudiences("back")}
        </button>
      </div>

      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-4">
        <p className="text-sm font-semibold text-slate-900">{tCreator("aiAudienceTitle")}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{tCreator("aiAudienceHint")}</p>

        <div className="mt-4">
          <AiAudienceTargetingForm
            clientSlug={ctx.clientSlug}
            adAccountId={ctx.adAccountId}
            audiences={ctx.audiences.map((a) => ({ id: a.id, name: a.name }))}
            showDemographics
            ageMin={ageMin}
            ageMax={ageMax}
            gender={gender}
            onDemographicsChange={(patch) => {
              if (patch.ageMin !== undefined) setAgeMin(patch.ageMin);
              if (patch.ageMax !== undefined) setAgeMax(patch.ageMax);
              if (patch.gender !== undefined) setGender(patch.gender);
            }}
            onSaved={() => {
              ctx.onSuccess(tAudiences("savedAudienceCreated"));
              ctx.onRefresh();
              onBack();
            }}
            onError={ctx.onError}
          />
        </div>
      </div>

      <details className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-600">
          {tAudiences("savedCopyAdvanced")}
        </summary>
        <SavedAudienceCopySection ctx={ctx} onBack={onBack} />
      </details>
    </div>
  );
}

export function CombineAudienceWizard({ ctx, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [includeIds, setIncludeIds] = useState<string[]>([]);
  const [excludeIds, setExcludeIds] = useState<string[]>([]);
  const [name, setName] = useState("");

  const customAudiences = ctx.audiences.filter(
    (a) => !(a.subtype ?? "").toUpperCase().includes("LOOKALIKE")
  );

  const toggle = (id: string, list: "include" | "exclude") => {
    if (list === "include") {
      setIncludeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      setExcludeIds((prev) => prev.filter((x) => x !== id));
    } else {
      setExcludeIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      setIncludeIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const submit = () => {
    if (!includeIds.length) {
      ctx.onError(t("combineSelectInclude"));
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/meta/audiences/combine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: ctx.clientSlug,
          adAccountId: ctx.adAccountId,
          name: name.trim() || t("combineDefaultName"),
          includeAudienceIds: includeIds,
          excludeAudienceIds: excludeIds.length ? excludeIds : undefined
        })
      });
      const j = await res.json();
      if (j.ok) {
        ctx.onSuccess(t("combineCreated"));
        ctx.onRefresh();
        onBack();
      } else {
        ctx.onError(j.error ?? t("createdFailed"));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{t("createType.combine.title")}</h2>
        <button type="button" onClick={onBack} className="ui-btn-secondary text-sm">
          {t("back")}
        </button>
      </div>

      <p className="text-xs text-slate-500">{t("combineDesc")}</p>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("combineInclude")}</label>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {customAudiences.map((a) => (
            <label key={`inc-${a.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={includeIds.includes(a.id)}
                onChange={() => toggle(a.id, "include")}
              />
              <span className="text-sm">{a.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("combineExclude")}</label>
        <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
          {customAudiences.map((a) => (
            <label key={`exc-${a.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={excludeIds.includes(a.id)}
                onChange={() => toggle(a.id, "exclude")}
              />
              <span className="text-sm">{a.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-500">{t("audienceName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("combineDefaultName")}
          className="ui-input mt-1 w-full text-sm"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending || !includeIds.length}
          onClick={submit}
          className="ui-btn-primary"
        >
          {pending ? t("creating") : t("createCombine")}
        </button>
      </div>
    </div>
  );
}
