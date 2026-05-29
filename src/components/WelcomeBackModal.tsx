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

  if (!open || events.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t("title")}</div>
            <div className="mt-1 text-xs text-slate-500">{t("subtitle")}</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
          >
            {tCommon("close")}
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {events.slice(0, 8).map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-700">{e.kind}</div>
                <div className={`text-[11px] ${e.success ? "text-emerald-400" : "text-rose-300"}`}>
                  {e.success ? "OK" : tCommon("error")}
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">{new Date(e.createdAt).toLocaleString()}</div>
              {e.errorMessage ? <div className="mt-1 text-xs text-rose-300">{e.errorMessage}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
