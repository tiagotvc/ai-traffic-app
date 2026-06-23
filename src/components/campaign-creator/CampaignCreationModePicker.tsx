"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PenLine, Sparkles, X } from "lucide-react";

import { Link } from "@/i18n/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  clientSlug?: string;
};

function buildHref(mode: "manual" | "ai", clientSlug?: string) {
  const params = new URLSearchParams();
  if (clientSlug) params.set("client", clientSlug);
  if (mode === "ai") params.set("mode", "ai");
  const qs = params.toString();
  return `/campaigns/new${qs ? `?${qs}` : ""}`;
}

export function CampaignCreationModePicker({ open, onClose, clientSlug }: Props) {
  const t = useTranslations("campaignCreator.ai");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
              {t("modePickerTitle")}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-dim)]">{t("modePickerHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
            aria-label={t("close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href={buildHref("manual", clientSlug)}
            onClick={onClose}
            className="group flex flex-col rounded-xl border border-[var(--border-color)] p-4 transition hover:border-[var(--violet)] hover:shadow-md"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[var(--text-main)]">
              <PenLine size={18} />
            </span>
            <span className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("modeManualTitle")}
            </span>
            <span className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("modeManualHint")}
            </span>
          </Link>

          <Link
            href={buildHref("ai", clientSlug)}
            onClick={onClose}
            className="group flex flex-col rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white p-4 transition hover:border-amber-400 hover:shadow-md"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Sparkles size={18} />
            </span>
            <span className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("modeAiTitle")}
            </span>
            <span className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
              {t("modeAiHint")}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
