"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";
import { partitionLabsExperiments, isLabsExperimentRunning } from "@/lib/labs/experiment-status";
import { SCIENTIST_CATALOG } from "@/lib/labs/scientist-catalog";
import type { LabsExperimentDto } from "@/lib/labs/types";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(t: (key: string) => string, status: string) {
  return t(`labsStatus_${status}`);
}

function ExperimentRow({
  item,
  onSelect
}: {
  item: LabsExperimentDto;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("agencyBrain");
  const running = isLabsExperimentRunning(item.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="flex w-full flex-wrap items-center gap-3 ui-card px-4 py-3 text-left transition hover:border-violet-500/20 hover:bg-[rgba(124,58,237,0.06)]0/5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-[var(--text-main)]">{item.name}</span>
          {running && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgba(124,58,237,0.06)]0" />
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-[var(--text-dim)]">
          {item.clientName ? `${item.clientName} · ` : ""}
          {item.product}
          {item.niche ? ` · ${item.niche}` : ""}
        </p>
        <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">{formatDate(item.createdAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--text-dim)]">
          {t("labsListScientists", { count: item.selectedScientists.length })}
        </span>
        <Badge variant={item.status === "completed" ? "success" : running ? "neutral" : "neutral"}>
          {statusLabel(t, item.status)}
        </Badge>
      </div>
    </button>
  );
}

type LabsExperimentsListProps = {
  items: LabsExperimentDto[];
  loading: boolean;
  onSelect: (id: string) => void;
};

export function LabsExperimentsList({ items, loading, onSelect }: LabsExperimentsListProps) {
  const t = useTranslations("agencyBrain");
  const { running, completed, failed } = partitionLabsExperiments(items);

  if (loading) {
    return (
      <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ui-card p-8 text-center">
        <p className="text-sm font-medium text-[var(--text-main)]">{t("labsEmptyTitle")}</p>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("labsEmpty")}</p>
        <p className="mt-3 text-xs text-[var(--text-dimmer)]">{t("labsKnowledgeHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {running.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-[var(--border-color)] bg-[rgba(124,58,237,0.06)]/50 px-5 py-3">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("labsSectionRunning", { count: running.length })}
            </h3>
          </div>
          <ul className="space-y-2 p-4">
            {running.map((item) => (
              <li key={item.id}>
                <ExperimentRow item={item} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-[var(--border-color)] px-5 py-3">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("labsSectionCompleted", { count: completed.length })}
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("labsSectionCompletedHint")}</p>
          </div>
          <ul className="space-y-2 p-4">
            {completed.map((item) => (
              <li key={item.id}>
                <ExperimentRow item={item} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {failed.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-red-100 bg-red-50/40 px-5 py-3">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("labsSectionFailed", { count: failed.length })}
            </h3>
          </div>
          <ul className="space-y-2 p-4">
            {failed.map((item) => (
              <li key={item.id}>
                <ExperimentRow item={item} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-[var(--text-dimmer)]">{t("labsKnowledgeHint")}</p>
    </div>
  );
}

export function scientistLabel(t: (key: string) => string, scientistId: string) {
  const entry = SCIENTIST_CATALOG.find((s) => s.id === scientistId);
  return entry ? t(entry.nameKey) : scientistId;
}
