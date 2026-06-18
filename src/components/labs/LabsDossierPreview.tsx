"use client";

import { useTranslations } from "next-intl";

type Dossier = Record<string, unknown>;

export function LabsDossierPreview({ dossier }: { dossier: Dossier }) {
  const t = useTranslations("agencyBrain");
  const summary = dossier.executiveSummary as Record<string, unknown> | undefined;
  const highlights = (dossier.highlights as Array<Record<string, string>>) ?? [];
  const hypotheses = (dossier.hypotheses as Array<Record<string, unknown>>) ?? [];
  const nextSteps = (dossier.nextSteps as string[]) ?? [];

  return (
    <div className="space-y-4">
      {summary && (
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
            {t("labsDossierSummary")}
          </p>
          {summary.headline ? (
            <p className="mt-2 text-sm font-medium text-slate-900">{String(summary.headline)}</p>
          ) : null}
          {summary.objective ? (
            <p className="mt-1 text-sm text-slate-600">{String(summary.objective)}</p>
          ) : null}
          {summary.note ? (
            <p className="mt-2 text-xs text-amber-800/90">{String(summary.note)}</p>
          ) : null}
        </div>
      )}

      {highlights.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("labsDossierHighlights")}
          </p>
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm shadow-sm"
              >
                <p className="font-medium text-slate-800">{h.title}</p>
                <p className="mt-0.5 text-slate-600">{h.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hypotheses.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("labsDossierHypotheses")}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {hypotheses.map((h, i) => (
              <li key={i}>
                {String(h.name)}
                {h.confidence != null && (
                  <span className="ml-1 text-xs text-slate-400">
                    ({Math.round(Number(h.confidence) * 100)}%)
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {nextSteps.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("labsDossierNextSteps")}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            {nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
