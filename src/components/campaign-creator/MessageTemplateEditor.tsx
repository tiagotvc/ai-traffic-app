"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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
  const channel = value?.channel ?? defaultChannel;
  const greeting = value?.greeting ?? "";
  const icebreakers = value?.icebreakers ?? [];

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
      templateId: value?.templateId ?? null,
      greeting,
      icebreakers,
      ...partial
    });
  }

  async function saveTemplate() {
    if (!clientSlug || !saveName.trim()) return;
    const res = await fetch(`/api/clients/${encodeURIComponent(clientSlug)}/message-templates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel, name: saveName.trim(), greeting, icebreakers })
    });
    const j = (await res.json()) as { ok?: boolean; template?: TemplateRow };
    if (j.ok && j.template) {
      setTemplates((prev) => [j.template!, ...prev]);
      patch({ templateId: j.template.id });
      setSaveName("");
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <FormField label={t("messageTemplateLibrary")}>
        <select
          value={value?.templateId ?? ""}
          onChange={(e) => {
            const id = e.target.value;
            const tpl = templates.find((x) => x.id === id);
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
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              [{tpl.channel}] {tpl.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("messageTemplateChannel")}>
        <select
          value={channel}
          onChange={(e) =>
            patch({ channel: e.target.value as "whatsapp" | "messenger" | "instagram" })
          }
          className="ui-select text-sm"
          disabled={disabled}
        >
          <option value="whatsapp">WhatsApp</option>
          <option value="messenger">Messenger</option>
          <option value="instagram">Instagram Direct</option>
        </select>
      </FormField>

      <FormField label={t("whatsappWelcomeMessage")}>
        <textarea
          value={greeting}
          onChange={(e) => patch({ greeting: e.target.value })}
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
          rows={4}
          disabled={disabled}
        />
      </FormField>

      <div className="flex gap-2">
        <input
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder={t("messageTemplateSaveName")}
          className="ui-input flex-1 text-xs"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => void saveTemplate()}
          disabled={disabled || !saveName.trim()}
          className="ui-btn-secondary text-xs"
        >
          {t("messageTemplateSave")}
        </button>
      </div>
    </div>
  );
}
