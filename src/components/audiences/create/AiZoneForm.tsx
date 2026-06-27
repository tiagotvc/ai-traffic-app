"use client";

import { forwardRef, useEffect, useImperativeHandle, useState, useTransition } from "react";
import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  CreatorAiPreviewSection,
  CreatorAiPromptField,
  CreatorAiProviderPicker
} from "@/components/campaign-creator/CreatorAiModalParts";
import type { ZoneGeoRules } from "@/db/entities/UserZone";

type ZonePreview = {
  zoneName: string;
  summary: string;
  places: Array<{ label: string; city?: string; state?: string; radiusKm?: number }>;
};

export type AiZoneFormActionState = {
  canSave: boolean;
  canClear: boolean;
  pending: boolean;
};

export type AiZoneFormHandle = {
  reset: () => void;
  save: () => void;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
  /** Omit title/close row when rendered inside CreatorAiModalShell. */
  embedded?: boolean;
  shellMode?: boolean;
  onActionStateChange?: (state: AiZoneFormActionState) => void;
};

export const AiZoneForm = forwardRef<AiZoneFormHandle, Props>(function AiZoneForm(
  { onClose, onSaved, embedded = false, shellMode = false, onActionStateChange },
  ref
) {
  const t = useTranslations("audiences");
  const [prompt, setPrompt] = useState("");
  const [defaultRadiusKm, setDefaultRadiusKm] = useState(3);
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [preview, setPreview] = useState<ZonePreview | null>(null);
  const [geoRules, setGeoRules] = useState<ZoneGeoRules | null>(null);
  const [resolvedName, setResolvedName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [providers, setProviders] = useState({ gemini: false, claude: false });

  useEffect(() => {
    fetch("/api/zones/ai-generate")
      .then((r) => r.json())
      .then((j: { providers?: { gemini: boolean; claude: boolean } }) => {
        if (j.providers) {
          setProviders(j.providers);
          if (j.providers.gemini) setProvider("gemini");
          else if (j.providers.claude) setProvider("claude");
        }
      })
      .catch(() => {});
  }, []);

  function resetForm() {
    setPrompt("");
    setDefaultRadiusKm(3);
    setPreview(null);
    setGeoRules(null);
    setResolvedName("");
    setError(null);
  }

  function runPreview() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "preview", prompt, provider, defaultRadiusKm })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? "Erro na IA");
        return;
      }
      setPreview(j.preview);
      setGeoRules(null);
    });
  }

  function geocode() {
    if (!preview) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "geocode", prompt, provider, defaultRadiusKm, preview })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? "Erro no geocoding");
        return;
      }
      setGeoRules(j.result.geoRules);
      setResolvedName(j.result.name);
    });
  }

  function save() {
    if (!geoRules) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/zones/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: "save",
          name: resolvedName || preview?.zoneName || "Nova Zona",
          description: preview?.summary,
          geoRules,
          sourcePrompt: prompt
        })
      });
      const j = await res.json();
      if (!j.ok) {
        setError(j.error ?? "Erro ao salvar");
        return;
      }
      onSaved();
    });
  }

  const canSave = !!geoRules && !pending;

  useImperativeHandle(ref, () => ({
    reset: resetForm,
    save
  }));

  useEffect(() => {
    onActionStateChange?.({
      canSave,
      canClear: Boolean(prompt || preview || geoRules),
      pending
    });
  }, [canSave, prompt, preview, geoRules, pending, onActionStateChange]);

  return (
    <div className="space-y-4">
      {!embedded && !shellMode ? (
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-[var(--text-main)]">{t("newZone")}</h2>
          <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
            {t("close")}
          </button>
        </div>
      ) : null}

      <CreatorAiProviderPicker
        provider={provider}
        onChange={setProvider}
        providers={providers}
        name="zone-ai-provider"
      />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <CreatorAiPromptField
          icon={<MapPin size={14} />}
          label={t("zonePromptLabel")}
          value={prompt}
          onChange={setPrompt}
          placeholder={t("zonePromptPlaceholder")}
          rows={4}
        />

        <label className="block space-y-1 sm:min-w-[8rem]">
          <span className="text-xs font-medium text-[var(--text-dim)]">{t("zoneRadiusLabel")}</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={70}
              step={1}
              className="ui-input text-sm"
              value={defaultRadiusKm}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next)) return;
                setDefaultRadiusKm(Math.min(70, Math.max(1, Math.round(next))));
              }}
            />
            <span className="text-xs text-[var(--text-dimmer)]">km</span>
          </div>
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("zoneRadiusHint")}</p>
        </label>
      </div>

      {!preview ? (
        <CreatorAiPreviewSection
          title={t("previewZone")}
          hint={t("zonePlacesLimitHint")}
          action={
            <button
              type="button"
              className="ui-btn-accent inline-flex w-full items-center justify-center gap-1.5 text-sm font-heading font-semibold sm:w-auto"
              disabled={pending || !prompt.trim()}
              onClick={runPreview}
            >
              {pending ? t("generating") : t("previewZone")}
            </button>
          }
        />
      ) : null}

      {preview ? (
        <div className="ui-card space-y-2 p-3 text-sm">
          <p className="font-medium text-[var(--text-main)]">{preview.zoneName}</p>
          <p className="text-[var(--text-dim)]">{preview.summary}</p>
          <ul className="list-inside list-disc text-[var(--text-dimmer)]">
            {preview.places.map((p) => (
              <li key={p.label}>
                {p.label}
                {p.radiusKm != null ? ` (${p.radiusKm} km)` : ` (${defaultRadiusKm} km)`}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-[var(--text-dimmer)]">{t("zonePlacesLimitHint")}</p>
          {!geoRules ? (
            <button
              type="button"
              className="ui-btn-secondary text-sm"
              disabled={pending}
              onClick={geocode}
            >
              {t("geocodeZone")}
            </button>
          ) : null}
        </div>
      ) : null}

      {geoRules?.customLocations?.length ? (
        <p className="text-sm text-[var(--text-dim)]">
          {t("zonePinCount", { count: geoRules.customLocations.length })}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!shellMode ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ui-btn-secondary" disabled={pending || !prompt.trim()} onClick={runPreview}>
            {pending ? t("generating") : t("previewZone")}
          </button>
          <button type="button" className="ui-btn-secondary" disabled={pending || !preview} onClick={geocode}>
            {t("geocodeZone")}
          </button>
          <button type="button" className="ui-btn-brand" disabled={pending || !geoRules} onClick={save}>
            {t("saveZone")}
          </button>
        </div>
      ) : null}
    </div>
  );
});
