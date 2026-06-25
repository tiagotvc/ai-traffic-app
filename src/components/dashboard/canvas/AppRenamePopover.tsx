"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function AppRenamePopover({
  name,
  subtitle,
  saving,
  onUpdateMeta
}: {
  name: string;
  subtitle: string | null;
  saving?: boolean;
  onUpdateMeta: (patch: { name?: string; subtitle?: string | null }) => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const tApps = useTranslations("dashboardApps");
  const [localName, setLocalName] = useState(name);
  const [localSubtitle, setLocalSubtitle] = useState(subtitle ?? "");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalName(name);
    setLocalSubtitle(subtitle ?? "");
  }, [name, subtitle]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function queueSave(nextName: string, nextSubtitle: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const patch: { name?: string; subtitle?: string | null } = {};
      const trimmedName = nextName.trim();
      const trimmedSubtitle = nextSubtitle.trim();
      if (trimmedName && trimmedName !== name) patch.name = trimmedName;
      if (trimmedSubtitle !== (subtitle ?? "")) patch.subtitle = trimmedSubtitle || null;
      if (Object.keys(patch).length) onUpdateMeta(patch);
    }, 500);
  }

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border p-4 shadow-lg"
      style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
        {t("renameAppTitle")}
      </p>
      <label className="mb-2 block text-xs text-[var(--text-dim)]">{tApps("appNamePlaceholder")}</label>
      <input
        type="text"
        value={localName}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value;
          setLocalName(next);
          queueSave(next, localSubtitle);
        }}
        placeholder={t("layoutNamePlaceholder")}
        className="ui-input mb-3 w-full"
      />
      <label className="mb-2 block text-xs text-[var(--text-dim)]">{t("layoutSubtitlePlaceholder")}</label>
      <input
        type="text"
        value={localSubtitle}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value;
          setLocalSubtitle(next);
          queueSave(localName, next);
        }}
        placeholder={t("layoutSubtitlePlaceholder")}
        className="ui-input w-full"
      />
    </div>
  );
}
