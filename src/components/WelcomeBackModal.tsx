"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type WelcomeBackEvent = {
  id: string;
  kind: string;
  success: boolean;
  createdAt: string;
  errorMessage?: string | null;
};

export function WelcomeBackModal({ events }: { events: WelcomeBackEvent[] }) {
  const t = useTranslations("welcome");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (events.length > 0) setOpen(true);
  }, [events.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || events.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("title")}</div>
            <div className="mt-1 text-xs text-[var(--text-dimmer)]">{t("subtitle")}</div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="ui-btn-secondary !px-2 !py-1 text-xs">
            {tCommon("close")}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {events.slice(0, 8).map((e) => (
            <div key={e.id} className="ui-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-[var(--text-dim)]">{e.kind}</div>
                <div className={`text-[11px] ${e.success ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                  {e.success ? "OK" : tCommon("error")}
                </div>
              </div>
              <div className="mt-1 text-xs text-[var(--text-dimmer)]">
                {new Date(e.createdAt).toLocaleString()}
              </div>
              {e.errorMessage ? (
                <div className="mt-1 text-xs text-[var(--danger)]">{e.errorMessage}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
