"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, Plus } from "lucide-react";

import { callGoogleMutate, type Notify } from "@/components/google/GoogleRowActions";

const ICON_BTN =
  "inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border-color)] text-[var(--text-dim)] transition hover:text-[var(--text-main)] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Ações de um TERMO DE PESQUISA: adicioná-lo como palavra-chave (positiva) ou como
 * palavra-chave NEGATIVA no grupo em que apareceu. Cria o critério via rota /mutate
 * (matchType PHRASE). Desabilita quando o termo já é keyword / já está excluído.
 */
export function SearchTermActions({
  clientId,
  adGroupId,
  text,
  status,
  onDone,
  notify
}: {
  clientId: string;
  adGroupId: string;
  text: string;
  status: string;
  onDone: (op: "add" | "addNegative") => void;
  notify: Notify;
}) {
  const t = useTranslations("client");
  const [pending, start] = useTransition();

  const alreadyKeyword = status === "ADDED" || status === "ADDED_EXCLUDED";
  const alreadyExcluded = status === "EXCLUDED" || status === "ADDED_EXCLUDED";

  function run(op: "add" | "addNegative") {
    start(async () => {
      const r = await callGoogleMutate(clientId, {
        resource: "keyword",
        op,
        adGroupId,
        text,
        matchType: "PHRASE",
        dryRun: false
      });
      if (r.ok) {
        notify(t("googleAddOk"), "success");
        onDone(op);
      } else if (r.error === "write_blocked") {
        notify(t("googleWriteBlocked"), "error");
      } else if (r.error === "not_connected") {
        notify(t("googleReconnect"), "error");
      } else {
        notify(r.message || t("googleActionFail"), "error");
      }
    });
  }

  if (!adGroupId) return null;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={pending || alreadyKeyword}
        onClick={() => run("add")}
        title={t("googleAddKeyword")}
        aria-label={t("googleAddKeyword")}
        className={`${ICON_BTN} hover:border-emerald-500/40 hover:text-emerald-400`}
      >
        <Plus size={13} />
      </button>
      <button
        type="button"
        disabled={pending || alreadyExcluded}
        onClick={() => run("addNegative")}
        title={t("googleAddNegative")}
        aria-label={t("googleAddNegative")}
        className={`${ICON_BTN} hover:border-rose-500/40 hover:text-rose-500`}
      >
        <Ban size={13} />
      </button>
    </span>
  );
}
