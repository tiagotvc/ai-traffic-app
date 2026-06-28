"use client";

import { useMemo, useState } from "react";

import type { CampaignExportPreviewModel } from "@/lib/export/campaign-export-preview-data";
import { cn } from "@/lib/cn";

type Props = {
  model: CampaignExportPreviewModel;
  chartsSectionLabel?: string;
  xlsxChartsHint?: string;
  xlsxPreviewLabel?: string;
  emptyLabel?: string;
  className?: string;
};

function PreviewMetaLine({ model }: { model: CampaignExportPreviewModel }) {
  return (
    <p className="text-[11px] text-[var(--text-dim)]">
      {[model.countLabel, model.periodLabel, model.clientScopeLabel, model.generatedAt]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}

function PreviewTable({
  model,
  headers,
  rows,
  totalsRow,
  emptyLabel,
  variant
}: {
  model: CampaignExportPreviewModel;
  headers: string[];
  rows: string[][];
  totalsRow: string[];
  emptyLabel?: string;
  variant: "pdf" | "xlsx";
}) {
  const headerClass =
    variant === "pdf"
      ? "bg-slate-800 text-slate-50"
      : "bg-[#217346] text-white";

  return (
    <table
      className={cn(
        "w-full min-w-[520px] border-collapse text-left text-[11px]",
        variant === "xlsx" && "border border-[var(--creator-card-border,var(--border-color))]"
      )}
    >
      <thead>
        <tr className={headerClass}>
          {headers.map((header, i) => (
            <th
              key={`${header}-${i}`}
              className={cn(
                "px-2 py-2 font-semibold",
                variant === "pdf" ? "border-b" : "border-r border-white/20 last:border-r-0",
                i >= model.metricStartIndex ? "text-right" : "text-left"
              )}
              style={variant === "pdf" ? { borderBottomColor: model.accentColor } : undefined}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={headers.length}
              className="px-2 py-8 text-center text-[var(--text-dim)]"
            >
              {emptyLabel ?? "—"}
            </td>
          </tr>
        ) : (
          rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                rowIndex % 2 === 1
                  ? "bg-violet-50/70 dark:bg-violet-950/20"
                  : rowIndex % 2 === 0
                    ? "bg-[var(--surface-muted)]/40"
                    : undefined
              )}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "px-2 py-1.5 text-[var(--text-main)]",
                    variant === "xlsx" &&
                      "border-r border-[var(--creator-card-border,var(--border-color))] last:border-r-0",
                    cellIndex >= model.metricStartIndex ? "text-right tabular-nums" : "text-left"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
        {rows.length > 0 ? (
          <tr style={{ background: `${model.accentColor}18` }}>
            {totalsRow.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                className={cn(
                  "px-2 py-1.5 font-semibold text-[var(--text-main)]",
                  variant === "xlsx" &&
                    "border-r border-[var(--creator-card-border,var(--border-color))] last:border-r-0",
                  cellIndex >= model.metricStartIndex ? "text-right tabular-nums" : "text-left"
                )}
              >
                {cell}
              </td>
            ))}
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function PdfExportPreview({
  model,
  chartsSectionLabel,
  xlsxChartsHint,
  emptyLabel,
  className
}: Props) {
  return (
    <div
      className={cn(
        "campaign-creator-card overflow-hidden border border-[var(--creator-card-border,var(--border-color))]",
        className
      )}
    >
      <div
        className="border-b px-4 py-4 text-center"
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
          borderBottom: `3px solid ${model.accentColor}`
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {model.includeLogo && model.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={model.logoUrl} alt="" className="max-h-8 w-auto object-contain" />
          ) : null}
          {model.agencyName ? (
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: model.accentColor }}
            >
              {model.agencyName}
            </p>
          ) : null}
          <h4 className="font-heading text-base font-bold text-white">{model.reportTitle}</h4>
          <PreviewMetaLine model={model} />
        </div>
      </div>

      <div className="max-h-[min(560px,55vh)] overflow-auto p-3">
        <PreviewTable
          model={model}
          headers={model.headers}
          rows={model.rows}
          totalsRow={model.totalsRow}
          emptyLabel={emptyLabel}
          variant="pdf"
        />
      </div>

      {model.chartTitles.length > 0 ? (
        <div className="border-t border-[var(--creator-card-border,var(--border-color))] px-4 py-3">
          {chartsSectionLabel ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              {chartsSectionLabel}
            </p>
          ) : null}
          <ul className="mt-1.5 space-y-1">
            {model.chartTitles.map((title) => (
              <li key={title} className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="h-2 w-2 rounded-full" style={{ background: model.accentColor }} />
                {title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.footerContact ? (
        <div className="border-t border-[var(--creator-card-border,var(--border-color))] px-4 py-2 text-center text-[10px] text-[var(--text-dim)]">
          {model.footerContact}
        </div>
      ) : null}
    </div>
  );
}

function XlsxExportPreview({
  model,
  chartsSectionLabel,
  xlsxChartsHint,
  xlsxPreviewLabel,
  emptyLabel,
  className
}: Props) {
  const sheets = model.sheets ?? [];
  const [activeSheetKey, setActiveSheetKey] = useState(sheets[0]?.key ?? "all");

  const activeSheet = useMemo(
    () => sheets.find((sheet) => sheet.key === activeSheetKey) ?? sheets[0],
    [sheets, activeSheetKey]
  );

  return (
    <div
      className={cn(
        "campaign-creator-card overflow-hidden border border-[var(--creator-card-border,var(--border-color))] bg-[var(--surface-card)]",
        className
      )}
    >
      <div className="border-b border-[var(--creator-card-border,var(--border-color))] bg-[var(--surface-muted)] px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              {xlsxPreviewLabel ?? "Excel preview"}
            </p>
            <h4 className="font-heading text-sm font-bold text-[var(--text-main)]">
              {model.reportTitle}
            </h4>
            <PreviewMetaLine model={model} />
          </div>
          <div className="rounded-md border border-[var(--creator-card-border,var(--border-color))] bg-white px-2 py-1 text-[10px] font-medium text-[#217346] dark:bg-[#1e293b]">
            .xlsx
          </div>
        </div>
      </div>

      <div className="max-h-[min(560px,55vh)] overflow-auto p-3">
        {activeSheet ? (
          <>
            <div className="mb-2 rounded-md border border-[var(--creator-card-border,var(--border-color))] bg-white px-3 py-2 dark:bg-[#0f172a]">
              <p className="text-xs font-semibold text-[var(--text-main)]">{model.reportTitle}</p>
              <PreviewMetaLine model={model} />
              {model.footerContact ? (
                <p className="mt-1 text-[10px] text-[var(--text-dim)]">{model.footerContact}</p>
              ) : null}
            </div>
            <PreviewTable
              model={model}
              headers={activeSheet.headers}
              rows={activeSheet.rows}
              totalsRow={activeSheet.totalsRow}
              emptyLabel={emptyLabel}
              variant="xlsx"
            />
          </>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-dim)]">{emptyLabel ?? "—"}</p>
        )}
      </div>

      {sheets.length > 0 ? (
        <div className="flex flex-wrap gap-0 border-t border-[var(--creator-card-border,var(--border-color))] bg-[var(--surface-muted)]">
          {sheets.map((sheet) => (
            <button
              key={sheet.key}
              type="button"
              onClick={() => setActiveSheetKey(sheet.key)}
              className={cn(
                "border-r border-[var(--creator-card-border,var(--border-color))] px-3 py-2 text-left text-[11px] transition",
                activeSheetKey === sheet.key
                  ? "bg-white font-semibold text-[var(--text-main)] dark:bg-[#0f172a]"
                  : "text-[var(--text-dim)] hover:bg-white/70 dark:hover:bg-[#0f172a]/70"
              )}
            >
              <span>{sheet.label}</span>
              <span className="ml-1 text-[10px] text-[var(--text-dim)]">({sheet.rowCount})</span>
            </button>
          ))}
          {model.chartSheetLabels?.map((label) => (
            <span
              key={label}
              className="border-r border-[var(--creator-card-border,var(--border-color))] px-3 py-2 text-[11px] text-[var(--text-dim)] last:border-r-0"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {model.chartTitles.length > 0 ? (
        <div className="border-t border-[var(--creator-card-border,var(--border-color))] px-4 py-3">
          {chartsSectionLabel ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
              {chartsSectionLabel}
            </p>
          ) : null}
          <ul className="mt-1.5 space-y-1">
            {model.chartTitles.map((title) => (
              <li key={title} className="flex items-center gap-2 text-xs text-[var(--text-main)]">
                <span className="h-2 w-2 rounded-full bg-[#217346]" />
                {title}
              </li>
            ))}
          </ul>
          {xlsxChartsHint ? (
            <p className="mt-2 text-[11px] text-[var(--text-dim)]">{xlsxChartsHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CampaignExportPreview(props: Props) {
  if (props.model.format === "xlsx") {
    return <XlsxExportPreview {...props} />;
  }
  return <PdfExportPreview {...props} />;
}
