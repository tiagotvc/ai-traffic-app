"use client";

import { useTranslations } from "next-intl";

export type GoogleRecActionType =
  | "NEGATIVAR"
  | "ADICIONAR_KEYWORD"
  | "PAUSAR"
  | "REDUZIR_LANCE"
  | "AUMENTAR_LANCE";

/** Estilo dos badges de ação das recomendações (contraste theme-aware). */
export const GOOGLE_REC_ACTION_STYLE: Record<GoogleRecActionType, string> = {
  NEGATIVAR:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/25",
  ADICIONAR_KEYWORD:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/25 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/25",
  PAUSAR:
    "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-600/25 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25",
  REDUZIR_LANCE:
    "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-600/25 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25",
  AUMENTAR_LANCE:
    "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-600/25 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/25"
};

/** Badge de ação recomendada (Negativar/Adicionar/…). `title` = justificativa no hover. */
export function GoogleRecBadge({
  actionType,
  title,
  size = "md"
}: {
  actionType: GoogleRecActionType;
  title?: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("client");
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs";
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold ${pad} ${GOOGLE_REC_ACTION_STYLE[actionType]}`}
    >
      {t(`googleRecAction_${actionType}`)}
    </span>
  );
}
