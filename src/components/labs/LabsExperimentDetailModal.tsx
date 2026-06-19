"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { LabsDossierPreview } from "@/components/labs/LabsDossierPreview";
import { scientistLabel } from "@/components/labs/LabsExperimentsList";
import { Badge } from "@/components/ui/Badge";
import { isLabsExperimentRunning } from "@/lib/labs/experiment-status";
import type { LabsAgentRunDto, LabsExperimentDto } from "@/lib/labs/types";

function statusLabel(t: (key: string) => string, status: string) {
  return t(`labsStatus_${status}`);
}

type LabsExperimentDetailModalProps = {
  open: boolean;
  experiment: LabsExperimentDto | null;
  runs: LabsAgentRunDto[];
  onClose: () => void;
};

export function LabsExperimentDetailModal({
  open,
  experiment,
  runs,
  onClose
}: LabsExperimentDetailModalProps) {
  const t = useTranslations("agencyBrain");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !experiment) return null;

  const running = isLabsExperimentRunning(experiment.status);
  const dossier = experiment.dossier;
  const hasStructuredDossier =
    dossier && typeof dossier === "object" && "executiveSummary" in dossier;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">{experiment.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {experiment.clientName ? `${experiment.clientName} · ` : ""}
              {experiment.product}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("labsModalClose")}
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{statusLabel(t, experiment.status)}</Badge>
            {running && (
              <span className="text-xs text-violet-600">{t("labsDetailRunning")}</span>
            )}
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {t("labsCreditsUsed", {
                used: experiment.creditsUsed,
                estimated: experiment.estimatedCredits
              })}
            </span>
          </div>

          {runs.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {t("labsDetailScientists")}
              </p>
              <ul className="space-y-2">
                {runs.map((run) => (
                  <li
                    key={run.id}
                    className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">
                        {scientistLabel(t, run.scientistId)}
                      </span>
                      <span className="text-xs text-slate-500">{run.status}</span>
                    </div>
                    {run.summary && (
                      <p className="mt-1 text-xs text-slate-600">{run.summary}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {experiment.status === "completed" && dossier && hasStructuredDossier && (
            <LabsDossierPreview dossier={dossier} />
          )}

          {experiment.status === "completed" && dossier && !hasStructuredDossier && (
            <pre className="max-h-64 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              {JSON.stringify(dossier, null, 2)}
            </pre>
          )}

          {experiment.status === "failed" && experiment.errorMessage && (
            <p className="text-sm text-red-600">{experiment.errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
