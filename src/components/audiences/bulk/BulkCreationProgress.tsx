"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, SkipForward, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { DsCard } from "@/design-system";
import { Link } from "@/i18n/navigation";
import type { BulkAudienceItemResult } from "@/lib/audiences/bulk/types";
import { cn } from "@/lib/cn";

import type { BulkQueueState } from "./useAudienceCreationQueue";

type Filter = "all" | "created" | "skipped" | "error";

function ResultIcon({ result }: { result: BulkAudienceItemResult }) {
  if (result.status === "created") return <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />;
  if (result.status === "skipped") return <SkipForward size={14} className="shrink-0 text-[var(--text-dimmer)]" />;
  return <XCircle size={14} className="shrink-0 text-red-500" />;
}

export function BulkCreationProgress({
  state,
  onCancel,
  onReset
}: {
  state: BulkQueueState;
  onCancel: () => void;
  onReset: () => void;
}) {
  const t = useTranslations("audiencesBulk");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c = { created: 0, skipped: 0, error: 0 };
    for (const r of state.results) c[r.status]++;
    return c;
  }, [state.results]);

  const total = state.plan.length;
  const done = state.results.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const finished = state.phase === "done";

  // Mais recentes primeiro durante a criação; na ordem do plano ao terminar.
  const rows = useMemo(() => {
    const list = filter === "all" ? state.results : state.results.filter((r) => r.status === filter);
    return finished ? list : [...list].reverse();
  }, [state.results, filter, finished]);

  function detail(r: BulkAudienceItemResult) {
    if (r.status === "skipped") {
      return r.reason === "exists" ? t("progress.skippedExists") : t("progress.skippedBatch");
    }
    if (r.status === "error") return r.error;
    return null;
  }

  const filters: Array<{ key: Filter; label: string; count: number }> = [
    { key: "all", label: t("progress.filterAll"), count: done },
    { key: "created", label: t("progress.created"), count: counts.created },
    { key: "skipped", label: t("progress.existing"), count: counts.skipped },
    { key: "error", label: t("progress.errors"), count: counts.error }
  ];

  return (
    <DsCard padding="lg" className="space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
          {finished
            ? state.cancelled
              ? t("progress.titleCancelled")
              : t("progress.titleDone")
            : state.phase === "planning"
              ? t("progress.titlePlanning")
              : t("progress.titleRunning")}
        </h2>
        {total ? (
          <span className="font-heading text-sm font-semibold tabular-nums text-[var(--text-main)]">
            {done} / {total}
          </span>
        ) : null}
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-bg)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-[var(--ui-accent)] transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      {finished ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t("progress.requested"), value: total },
            { label: t("progress.created"), value: counts.created },
            { label: t("progress.existing"), value: counts.skipped },
            { label: t("progress.errors"), value: counts.error }
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--border-color)] px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-[var(--text-dimmer)]">{s.label}</dt>
              <dd className="font-heading text-xl font-semibold tabular-nums text-[var(--text-main)]">{s.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {state.rejectedVideoIds.length ? (
        <details className="ui-alert-warning text-sm">
          <summary className="cursor-pointer">
            {t("progress.rejectedVideos", { count: state.rejectedVideoIds.length })}
          </summary>
          <p className="mt-2 break-words font-mono text-xs">{state.rejectedVideoIds.join(", ")}</p>
        </details>
      ) : null}

      {done ? (
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition",
                filter === f.key
                  ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                  : "border-[var(--border-color)] text-[var(--text-dim)]"
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {rows.map((r) => {
            const d = detail(r);
            return (
              <li key={r.key} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5">
                  <ResultIcon result={r} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[var(--text-main)]">{r.name}</span>
                  {d ? (
                    <span
                      className={cn(
                        "block break-words text-xs",
                        r.status === "error" ? "text-red-500" : "text-[var(--text-dimmer)]"
                      )}
                    >
                      {d}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        {finished ? (
          <>
            <Link href="/audiences/meta" className="ui-btn-secondary px-4 py-2 text-sm">
              {t("progress.viewAudiences")}
            </Link>
            <button type="button" onClick={onReset} className="ui-btn-accent px-4 py-2 text-sm font-semibold">
              {t("progress.newBatch")}
            </button>
          </>
        ) : state.phase === "running" ? (
          <button type="button" onClick={onCancel} className="ui-btn-secondary px-4 py-2 text-sm">
            {t("progress.cancel")}
          </button>
        ) : null}
      </div>
    </DsCard>
  );
}
