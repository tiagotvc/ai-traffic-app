"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { DsPageHeader, DsUnderlineTabs } from "@/design-system";
import {
  DEFAULT_THEME_CONFIG,
  mergeThemeConfig,
  paletteToCssVars,
  THEME_TOKEN_DEFS,
  THEME_UPDATED_EVENT,
  toColorInputValue,
  type DesignSystemThemeConfig,
  type ThemeMode,
  type ThemePalette,
  type ThemeTokenGroup
} from "@/lib/design-system/theme-config";

const GROUPS: ThemeTokenGroup[] = ["surfaces", "accent", "brand"];

function paletteToPreviewStyle(palette: ThemePalette): React.CSSProperties {
  const vars = paletteToCssVars(palette);
  return vars as React.CSSProperties;
}

function ColorField({
  label,
  hint,
  value,
  colorPicker,
  onChange
}: {
  label: string;
  hint?: string;
  value: string;
  colorPicker: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-[var(--text-main)]">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{hint}</span> : null}
      <div className="mt-2 flex items-center gap-2">
        {colorPicker ? (
          <input
            type="color"
            value={toColorInputValue(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-9 shrink-0 cursor-pointer rounded border border-[var(--border-color)] bg-transparent p-0.5"
            aria-label={label}
          />
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="ui-input min-w-0 flex-1 font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </label>
  );
}

function ThemePreview({ mode, palette }: { mode: ThemeMode; palette: ThemePalette }) {
  const t = useTranslations("billingAdmin");
  return (
    <div
      data-theme={mode}
      className="overflow-hidden rounded-xl border"
      style={{
        ...paletteToPreviewStyle(palette),
        background: palette.surfaceBg,
        borderColor: palette.borderColor
      }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: palette.borderColor }}>
        <p className="font-heading text-sm font-bold" style={{ color: palette.textMain }}>
          {t("themePreviewTitle")}
        </p>
        <p className="text-xs" style={{ color: palette.textDim }}>
          {t("themePreviewSubtitle")}
        </p>
      </div>
      <div className="space-y-3 p-4">
        <div
          className="rounded-lg border p-3"
          style={{ background: palette.surfaceCard, borderColor: palette.borderColor }}
        >
          <p className="text-sm font-medium" style={{ color: palette.textMain }}>
            {t("themePreviewCard")}
          </p>
          <p className="text-xs" style={{ color: palette.textDimmer }}>
            {t("themePreviewCardHint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: `linear-gradient(135deg, ${palette.uiAccentBtnFrom}, ${palette.uiAccentBtnTo})`,
              color: palette.uiAccentBtnText
            }}
          >
            {t("themePreviewCta")}
          </span>
          <span
            className="inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: palette.uiAccentBorder,
              color: palette.uiAccent,
              background: palette.uiAccentMuted
            }}
          >
            {t("themePreviewOutline")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AdminThemeClient() {
  const t = useTranslations("billingAdmin");
  const [config, setConfig] = useState<DesignSystemThemeConfig | null>(null);
  const [draft, setDraft] = useState<DesignSystemThemeConfig | null>(null);
  const [mode, setMode] = useState<ThemeMode>("light");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform/theme");
      const json = await res.json();
      if (json.ok) {
        const merged = mergeThemeConfig(json.config);
        setConfig(merged);
        setDraft(merged);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!config || !draft) return false;
    return JSON.stringify(config) !== JSON.stringify(draft);
  }, [config, draft]);

  function updateToken(key: keyof ThemePalette, value: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            [mode]: { ...prev[mode], [key]: value }
          }
        : prev
    );
  }

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/platform/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ light: draft.light, dark: draft.dark })
      });
      const json = await res.json();
      if (json.ok) {
        const merged = mergeThemeConfig(json.config);
        setConfig(merged);
        setDraft(merged);
        setMessage(t("themeSaved"));
        window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: merged }));
      } else {
        setMessage(json.error ?? t("saveError"));
      }
    });
  };

  const reset = () => {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/admin/platform/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true })
      });
      const json = await res.json();
      if (json.ok) {
        const merged = mergeThemeConfig(json.config);
        setConfig(merged);
        setDraft(merged);
        setMessage(t("themeResetDone"));
        window.dispatchEvent(new CustomEvent(THEME_UPDATED_EVENT, { detail: merged }));
      } else {
        setMessage(json.error ?? t("saveError"));
      }
    });
  };

  const discard = () => {
    if (config) setDraft(config);
    setMessage(null);
  };

  if (loading || !draft) {
    return <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>;
  }

  const palette = draft[mode];

  return (
    <div className="space-y-6">
      <DsPageHeader
        title={t("themeTitle")}
        subtitle={t("themeSubtitle")}
        titleIcon={<Palette size={16} />}
      />

      {message ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <DsUnderlineTabs
        accent="brand"
        tabs={[
          { key: "light", label: t("themeTabLight") },
          { key: "dark", label: t("themeTabDark") }
        ]}
        active={mode}
        onChange={(id) => setMode(id)}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {GROUPS.map((group) => (
            <section key={group} className="campaign-creator-card campaign-creator-card--compact">
              <h2 className="campaign-creator-orion-section-label mb-4">{t(`themeGroup_${group}`)}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {THEME_TOKEN_DEFS.filter((def) => def.group === group).map((def) => (
                  <ColorField
                    key={def.key}
                    label={t(`themeToken_${def.key}`)}
                    hint={t(`themeToken_${def.key}_hint`)}
                    value={palette[def.key]}
                    colorPicker={def.colorPicker}
                    onChange={(value) => updateToken(def.key, value)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <p className="campaign-creator-orion-section-label">{t("themePreviewHeading")}</p>
          <div className="campaign-creator-sidebar-card">
            <ThemePreview mode={mode} palette={palette} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="ui-btn-accent" disabled={isPending || !dirty} onClick={save}>
          {isPending ? t("saving") : t("themeSave")}
        </button>
        <button
          type="button"
          className="ui-btn-secondary inline-flex items-center gap-1.5"
          disabled={isPending || !dirty}
          onClick={discard}
        >
          <RotateCcw size={14} />
          {t("reset")}
        </button>
        <button
          type="button"
          className="ui-btn-secondary inline-flex items-center gap-1.5"
          disabled={isPending}
          onClick={reset}
        >
          {t("themeResetDefaults")}
        </button>
      </div>
    </div>
  );
}
