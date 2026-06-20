"use client";

import { useTranslations } from "next-intl";

type Props = {
  channel?: "whatsapp" | "messenger" | "instagram";
  greeting: string;
  icebreakers?: string[];
  compact?: boolean;
};

export function MessageTemplatePreview({
  channel = "whatsapp",
  greeting,
  icebreakers = [],
  compact
}: Props) {
  const t = useTranslations("campaignCreator");

  if (!greeting.trim() && !icebreakers.length) {
    return (
      <p className="text-[11px] text-[var(--text-dimmer)] italic">{t("messageTemplatePreviewEmpty")}</p>
    );
  }

  const channelLabel =
    channel === "whatsapp"
      ? "WhatsApp"
      : channel === "instagram"
        ? "Instagram"
        : "Messenger";

  return (
    <div
      className={`rounded-xl border border-[var(--border-color)] bg-[#e5ddd5] ${compact ? "p-2" : "p-3"}`}
      aria-label={t("messageTemplatePreview")}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dim)]">
        {t("messageTemplatePreview")} · {channelLabel}
      </p>
      {greeting.trim() ? (
        <div className="max-w-[92%] rounded-lg rounded-tl-none bg-[var(--surface-card)] px-3 py-2 text-xs text-[var(--text-main)] shadow-sm">
          {greeting.trim()}
        </div>
      ) : null}
      {icebreakers.length ? (
        <div className={`flex flex-col gap-1.5 ${greeting.trim() ? "mt-2" : ""}`}>
          {icebreakers.map((line) => (
            <div
              key={line}
              className="max-w-[92%] self-end rounded-full border border-emerald-600/30 bg-[var(--surface-card)] px-3 py-1.5 text-[11px] font-medium text-emerald-800"
            >
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
