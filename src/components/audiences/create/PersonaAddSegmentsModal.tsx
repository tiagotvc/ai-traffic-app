"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion,
  AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";

type Props = {
  open: boolean;
  onClose: () => void;
  apiBase: string;
  buildPayload: () => Record<string, unknown>;
  persona: AudiencePersonaPreview;
  suggestion: AudienceTargetingSuggestion;
  keepItems: AudienceTargetingSuggestionItem[];
  onSuccess: (suggestion: AudienceTargetingSuggestion) => void;
  onError?: (message: string) => void;
};

export function PersonaAddSegmentsModal({
  open,
  onClose,
  apiBase,
  buildPayload,
  persona,
  suggestion,
  keepItems,
  onSuccess,
  onError
}: Props) {
  const t = useTranslations("audiences");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    const trimmed = prompt.trim();
    if (trimmed.length < 3) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...buildPayload(),
            phase: "add_segments",
            persona,
            keepItems,
            addPrompt: trimmed,
            suggestionMeta: {
              title: suggestion.title,
              summary: suggestion.summary,
              name: suggestion.name,
              includeCustomAudienceIds: suggestion.includeCustomAudienceIds,
              excludeCustomAudienceIds: suggestion.excludeCustomAudienceIds,
              provider: suggestion.provider,
              modelUsed: suggestion.modelUsed
            }
          })
        });
        const j = (await res.json()) as {
          ok?: boolean;
          suggestion?: AudienceTargetingSuggestion;
          error?: string;
        };
        if (!j.ok || !j.suggestion) {
          const msg = j.error ?? t("personaSegmentAddFailed");
          setError(msg);
          onError?.(msg);
          return;
        }
        onSuccess(j.suggestion);
        setPrompt("");
        onClose();
      } catch {
        const msg = t("personaSegmentAddFailed");
        setError(msg);
        onError?.(msg);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-lg">
        <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
          {t("personaSegmentAddTitle")}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-dim)]">{t("personaSegmentAddHint")}</p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("personaSegmentAddPlaceholder")}
          rows={4}
          disabled={pending}
          className="ui-textarea mt-3 w-full text-sm"
        />
        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="ui-btn-secondary text-xs"
          >
            {t("cancelEdit")}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={pending || prompt.trim().length < 3}
            className="ui-btn-brand text-xs disabled:opacity-50"
          >
            {pending ? t("personaSegmentAddLoading") : t("personaSegmentAddSubmit")}
          </button>
        </div>
      </div>
    </div>
  );
}
