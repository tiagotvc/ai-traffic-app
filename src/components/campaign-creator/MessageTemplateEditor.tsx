"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { MessageTemplatePreview } from "@/components/campaign-creator/MessageTemplatePreview";
import { FormField } from "@/components/ui/FormField";
import type { AdDraftItem } from "@/lib/campaign-draft";

type TemplateRow = {
  id: string;
  channel: "whatsapp" | "messenger" | "instagram";
  name: string;
  greeting: string;
  icebreakers: string[];
};

type Props = {
  clientSlug: string;
  value: AdDraftItem["messageTemplate"];
  onChange: (tpl: AdDraftItem["messageTemplate"]) => void;
  defaultChannel?: "whatsapp" | "messenger" | "instagram";
  disabled?: boolean;
};

export function MessageTemplateEditor({
  clientSlug,
  value,
  onChange,
  defaultChannel = "whatsapp",
  disabled
}: Props) {
  const t = useTranslations("campaignCreator");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [saveName, setSaveName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const channel = value?.channel ?? defaultChannel;
  const greeting = value?.greeting ?? "";
  const icebreakers = value?.icebreakers ?? [];
  const selectedId = value?.templateId ?? null;

  const channelTemplates = useMemo(
    () => templates.filter((tpl) => tpl.channel === channel),
    [templates, channel]
  );

  useEffect(() => {
    if (!clientSlug) return;
    fetch(`/api/clients/${encodeURIComponent(clientSlug)}/message-templates`)
      .then((r) => r.json())
      .then((j: { templates?: TemplateRow[] }) => setTemplates(j.templates ?? []))
      .catch(() => setTemplates([]));
  }, [clientSlug]);

  function patch(partial: Partial<NonNullable<AdDraftItem["messageTemplate"]>>) {
    onChange({
      channel,
      templateId: selectedId,
      greeting,
      icebreakers,
      ...partial
    });
  }

  async function saveTemplate(asNew: boolean) {
    if (!clientSlug) return;
    const name = asNew ? saveName.trim() : channelTemplates.find((x) => x.id === selectedId)?.name;
    if (!name) return;

    if (asNew) {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/message-templates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, name, greeting, icebreakers })
      });
      const j = (await res.json()) as { ok?: boolean; template?: TemplateRow };
      if (j.ok && j.template) {
        setTemplates((prev) => [j.template!, ...prev]);
        patch({ templateId: j.template.id });
        setSaveName("");
        setStatus(t("messageTemplateSaved"));
      }
      return;
    }

    if (!selectedId) return;
    const res = await fetch(
      `/api/clients/${encodeURIComponent(clientSlug)}/message-templates/${encodeURIComponent(selectedId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ channel, greeting, icebreakers })
      }
    );
    const j = (await res.json()) as { ok?: boolean; template?: TemplateRow };
    if (j.ok && j.template) {
      setTemplates((prev) => prev.map((x) => (x.id === j.template!.id ? j.template! : x)));
      setStatus(t("messageTemplateUpdated"));
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4">
      <div>
        <h4 className="text-sm font-semibold text-[var(--text-main)]">{t("messageTemplateSectionTitle")}</h4>
        <p className="mt-1 text-[11px] text-[var(--text-dim)]">{t("messageTemplateSectionHint")}</p>
      </div>

      <FormField label={t("messageTemplateLibrary")}>
        <select
          value={selectedId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            const tpl = channelTemplates.find((x) => x.id === id);
            if (!tpl) {
              patch({ templateId: null });
              return;
            }
            onChange({
              channel: tpl.channel,
              templateId: tpl.id,
              greeting: tpl.greeting,
              icebreakers: tpl.icebreakers
            });
          }}
          className="ui-select text-sm"
          disabled={disabled}
        >
          <option value="">{t("messageTemplatePick")}</option>
          {channelTemplates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("messageTemplateChannel")}>
        <select
          value={channel}
          onChange={(e) =>
            patch({
              channel: e.target.value as "whatsapp" | "messenger" | "instagram",
              templateId: null
            })
          }
          className="ui-select text-sm"
          disabled={disabled}
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="messenger">Messenger</option>
          <option value="instagram">Instagram Direct</option>
        </select>
      </FormField>

      <FormField label={t("messageTemplateGreeting")}>
        <textarea
          value={greeting}
          onChange={(e) => patch({ greeting: e.target.value })}
          placeholder={t("whatsappWelcomeMessagePlaceholder")}
          className="ui-textarea text-sm"
          rows={3}
          disabled={disabled}
        />
      </FormField>

      <FormField label={t("messageIcebreakers")}>
        <textarea
          value={icebreakers.join("\n")}
          onChange={(e) =>
            patch({
              icebreakers: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean)
            })
          }
          placeholder={t("messageIcebreakersPlaceholder")}
          className="ui-textarea text-sm"
          rows={3}
          disabled={disabled}
        />
        <p className="mt-1 text-[10px] text-[var(--text-dim)]">{t("messageIcebreakersHint")}</p>
      </FormField>

      <MessageTemplatePreview channel={channel} greeting={greeting} icebreakers={icebreakers} />

      <div className="flex flex-wrap gap-2 border-t border-emerald-100 pt-3">
        <input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={t("messageTemplateSaveName")}
          className="ui-input min-w-[140px] flex-1 text-xs"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => void saveTemplate(true)}
          disabled={disabled || !saveName.trim() || !greeting.trim()}
          className="ui-btn-secondary text-xs"
        >
          {t("messageTemplateSave")}
        </button>
        {selectedId ? (
          <button
            type="button"
            onClick={() => void saveTemplate(false)}
            disabled={disabled || !greeting.trim()}
            className="ui-btn-secondary text-xs"
          >
            {t("messageTemplateUpdate")}
          </button>
        ) : null}
      </div>

      {status ? <p className="text-[11px] text-emerald-700">{status}</p> : null}
    </div>
  );
}
