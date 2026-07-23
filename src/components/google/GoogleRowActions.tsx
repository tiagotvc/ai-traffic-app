"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Trash2 } from "lucide-react";

export type GoogleResource = "campaign" | "adGroup" | "ad" | "keyword";
export type ActionVariant = "success" | "error";
export type Notify = (text: string, variant: ActionVariant) => void;

/** POST para a rota de escrita; normaliza ok/erro/mensagem. */
export async function callGoogleMutate(clientId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/google-ads/mutate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const j = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    message?: string;
  } | null;
  return {
    ok: res.ok && !!j?.ok,
    error: j?.error,
    message: j?.message
  };
}

/** Banner de status por tela + função `notify` para as ações reportarem resultado. */
export function useGoogleActionFeedback() {
  const [msg, setMsg] = useState<{ text: string; variant: ActionVariant } | null>(null);
  const notify: Notify = (text, variant) => setMsg({ text, variant });
  const node = msg ? (
    <div
      role="alert"
      className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs ${
        msg.variant === "error" ? "ui-alert-danger" : "ui-alert-success"
      }`}
    >
      <span>{msg.text}</span>
      <button
        type="button"
        onClick={() => setMsg(null)}
        aria-label="Fechar"
        className="shrink-0 opacity-70 transition hover:opacity-100"
      >
        ×
      </button>
    </div>
  ) : null;
  return { node, notify };
}

const ICON_BTN =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-dim)] transition hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Ações inline de uma linha Google (ativar/pausar/excluir). Excluir pede confirmação
 * inline (é permanente no Google). Reporta resultado via `notify`; chama `onDone` para
 * a tela recarregar após aplicar.
 */
export function GoogleRowActions({
  clientId,
  resource,
  id,
  adGroupId,
  status,
  onDone,
  notify,
  onlyRemove = false
}: {
  clientId: string;
  resource: GoogleResource;
  id: string;
  adGroupId?: string;
  status: string;
  onDone: () => void;
  notify: Notify;
  /** Só o botão de excluir (ex.: palavra-chave negativa não tem pausar/ativar). */
  onlyRemove?: boolean;
}) {
  const t = useTranslations("client");
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const removed = status === "REMOVED";

  function run(op: "enable" | "pause" | "remove") {
    start(async () => {
      const r = await callGoogleMutate(clientId, { resource, op, id, adGroupId, dryRun: false });
      if (r.ok) {
        notify(op === "remove" ? t("googleRemoveOk") : t("googleActionOk"), "success");
        onDone();
      } else if (r.error === "write_blocked") {
        notify(t("googleWriteBlocked"), "error");
      } else if (r.error === "not_connected") {
        notify(t("googleReconnect"), "error");
      } else {
        notify(r.message || t("googleActionFail"), "error");
      }
    });
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px]">
        <span className="text-[var(--text-dimmer)]">{t("googleRemoveConfirm")}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            run("remove");
          }}
          className="font-semibold text-rose-500 hover:text-rose-400 disabled:opacity-40"
        >
          {t("googleConfirm")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-[var(--text-dim)] hover:text-[var(--text-main)]"
        >
          {t("googleCancel")}
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {onlyRemove ? null : status === "ENABLED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("pause")}
          title={t("googlePause")}
          aria-label={t("googlePause")}
          className={ICON_BTN}
        >
          <Pause size={13} />
        </button>
      ) : status === "PAUSED" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("enable")}
          title={t("googleActivate")}
          aria-label={t("googleActivate")}
          className={ICON_BTN}
        >
          <Play size={13} />
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending || removed}
        onClick={() => setConfirming(true)}
        title={t("googleRemove")}
        aria-label={t("googleRemove")}
        className={`${ICON_BTN} hover:border-rose-500/40 hover:text-rose-500`}
      >
        <Trash2 size={13} />
      </button>
    </span>
  );
}
