"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { ZoneGeoRules } from "@/db/entities/UserZone";

type ZonePreview = {
  zoneName: string;
  summary: string;
  places: Array<{ label: string; city?: string; state?: string; radiusKm?: number }>;
};

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export function AiZoneForm({ onClose, onSaved }: Props) {
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
  const tCreator = useTranslations("campaignCreator");

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-[var(--text-main)]">{t("newZone")}</h2>
        <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
          {t("close")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2">
        <span className="text-[10px] font-medium uppercase text-[var(--text-dim)]">
          {tCreator("aiProviderLabel")}
        </span>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name="zone-ai-provider"
            checked={provider === "gemini"}
            onChange={() => setProvider("gemini")}
            disabled={!providers.gemini}
          />
          Gemini
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="radio"
            name="zone-ai-provider"
            checked={provider === "claude"}
            onChange={() => setProvider("claude")}
            disabled={!providers.claude}
          />
          Claude
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <label className="block space-y-1">
          <span className="text-sm text-[var(--text-dim)]">{t("zonePromptLabel")}</span>
          <textarea
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] p-3 text-sm"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("zonePromptPlaceholder")}
          />
        </label>

        <label className="block space-y-1 sm:min-w-[8rem]">
          <span className="text-sm text-[var(--text-dim)]">{t("zoneRadiusLabel")}</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={70}
              step={1}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-bg)] px-3 py-2 text-sm"
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
        </div>
      ) : null}

      {geoRules?.customLocations?.length ? (
        <p className="text-sm text-[var(--text-dim)]">
          {t("zonePinCount", { count: geoRules.customLocations.length })}
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

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
    </div>
  );
}
