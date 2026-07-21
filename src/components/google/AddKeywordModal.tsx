"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { callGoogleMutate, type Notify } from "@/components/google/GoogleRowActions";

type MatchType = "EXACT" | "PHRASE" | "BROAD";

/**
 * Modal para adicionar palavra-chave (positiva) ou palavra-chave NEGATIVA a um grupo.
 * `mode` decide o tipo. Escrita real via rota mutate (dryRun:false).
 */
export function AddKeywordModal({
  clientId,
  adGroupId,
  mode,
  open,
  onClose,
  onDone,
  notify
}: {
  clientId: string;
  adGroupId: string;
  mode: "keyword" | "negative";
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const t = useTranslations("client");
  const [text, setText] = useState("");
  const [matchType, setMatchType] = useState<MatchType>("BROAD");
  const [pending, start] = useTransition();

  const negative = mode === "negative";
  const title = negative ? t("googleAddNegative") : t("googleAddKeyword");

  function submit() {
    const value = text.trim();
    if (!value) return;
    start(async () => {
      const r = await callGoogleMutate(clientId, {
        resource: "keyword",
        op: negative ? "addNegative" : "add",
        adGroupId,
        text: value,
        matchType,
        dryRun: false
      });
      if (r.ok) {
        notify(t("googleAddOk"), "success");
        setText("");
        onDone();
        onClose();
      } else if (r.error === "write_blocked") {
        notify(t("googleWriteBlocked"), "error");
      } else if (r.error === "not_connected") {
        notify(t("googleReconnect"), "error");
      } else {
        notify(r.message || t("googleActionFail"), "error");
      }
    });
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title={title}
      width="md"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary px-3 py-1.5 text-xs"
          >
            {t("googleCancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            className="ui-btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {pending ? t("googleSaving") : t("googleAdd")}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-dim)]">{t("googleKeywordText")}</span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={negative ? t("googleAddNegativePlaceholder") : t("googleAddKeywordPlaceholder")}
            className="mt-1 w-full rounded-xl ui-input text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-[var(--text-dim)]">{t("googleColMatch")}</span>
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as MatchType)}
            className="mt-1 w-full rounded-xl ui-input text-sm"
          >
            <option value="BROAD">{t("googleMatchBroad")}</option>
            <option value="PHRASE">{t("googleMatchPhrase")}</option>
            <option value="EXACT">{t("googleMatchExact")}</option>
          </select>
        </label>
        {negative ? (
          <p className="text-xs text-[var(--text-dimmer)]">{t("googleAddNegativeHint")}</p>
        ) : null}
      </div>
    </CreatorModalShell>
  );
}
