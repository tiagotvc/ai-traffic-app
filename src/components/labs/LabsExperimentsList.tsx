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
      className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50/30"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{item.name}</span>
          {running && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          {item.clientName ? `${item.clientName} · ` : ""}
          {item.product}
          {item.niche ? ` · ${item.niche}` : ""}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">{formatDate(item.createdAt)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">
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
      <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ui-card p-8 text-center">
        <p className="text-sm font-medium text-slate-800">{t("labsEmptyTitle")}</p>
        <p className="mt-1 text-sm text-slate-500">{t("labsEmpty")}</p>
        <p className="mt-3 text-xs text-slate-400">{t("labsKnowledgeHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {running.length > 0 && (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-slate-100 bg-violet-50/50 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
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
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              {t("labsSectionCompleted", { count: completed.length })}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">{t("labsSectionCompletedHint")}</p>
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
            <h3 className="text-sm font-semibold text-slate-900">
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

      <p className="text-center text-xs text-slate-400">{t("labsKnowledgeHint")}</p>
    </div>
  );
}

export function scientistLabel(t: (key: string) => string, scientistId: string) {
  const entry = SCIENTIST_CATALOG.find((s) => s.id === scientistId);
  return entry ? t(entry.nameKey) : scientistId;
}
