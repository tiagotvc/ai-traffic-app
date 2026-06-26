"use client";

import { Link } from "@/i18n/navigation";
import { CampaignStatusToggle } from "@/components/campaign/CampaignStatusToggle";
import { Badge } from "@/components/ui/Badge";

export type CampaignRowLike = {
  metaCampaignId: string;
  campaignName: string;
  clientName: string;
  clientSlug: string;
  spend: number;
  roas: number;
  cpl: number | null;
  status?: string;
  draftTemplateId?: string;
};

export function CampaignMobileCards({
  rows,
  detailHref,
  formatMoney,
  formatRoas,
  formatCpl,
  statusLabel,
  statusPendingId,
  onToggleStatus,
  onRemember
}: {
  rows: CampaignRowLike[];
  detailHref: (row: CampaignRowLike) => string;
  formatMoney: (n: number) => string;
  formatRoas: (n: number) => string;
  formatCpl: (n: number | null) => string;
  statusLabel: (status?: string) => string;
  statusPendingId: string | null;
  onToggleStatus: (id: string, status?: string) => void;
  onRemember: (id: string, clientSlug: string) => void;
}) {
  if (!rows.length) return null;

  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => (
        <article
          key={row.metaCampaignId}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={detailHref(row)}
                onClick={() => onRemember(row.metaCampaignId, row.clientSlug)}
                className="ui-link block font-medium leading-snug"
              >
                {row.campaignName}
              </Link>
              <p className="mt-1 truncate text-xs text-[var(--text-dim)]">{row.clientName}</p>
            </div>
            <CampaignStatusToggle
              active={row.status === "ACTIVE"}
              disabled={statusPendingId === row.metaCampaignId}
              ariaLabel={statusLabel(row.status)}
              onChange={() => onToggleStatus(row.metaCampaignId, row.status)}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-[var(--surface-bg)] px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">Spend</p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--text-main)]">{formatMoney(row.spend)}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-bg)] px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">ROAS</p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--text-main)]">{formatRoas(row.roas)}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-bg)] px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">CPL</p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--text-main)]">{formatCpl(row.cpl)}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CampaignDraftMobileCards({
  rows,
  resumeHref,
  onDiscard,
  discardPendingId,
  statusDraftLabel,
  resumeLabel,
  discardLabel
}: {
  rows: CampaignRowLike[];
  resumeHref: (row: CampaignRowLike) => string;
  onDiscard: (row: CampaignRowLike) => void;
  discardPendingId: string | null;
  statusDraftLabel: string;
  resumeLabel: string;
  discardLabel: string;
}) {
  if (!rows.length) return null;

  return (
    <div className="space-y-2 md:hidden">
      {rows.map((row) => {
        const pending = discardPendingId === row.metaCampaignId;
        return (
          <article
            key={row.metaCampaignId}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Link href={resumeHref(row)} className="ui-link block font-medium leading-snug">
                  {row.campaignName}
                </Link>
                <p className="mt-1 truncate text-xs text-[var(--text-dim)]">{row.clientName}</p>
              </div>
              <Badge variant="accent">{statusDraftLabel}</Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={resumeHref(row)} className="ui-link flex-1 rounded-lg border border-[var(--border-color)] py-2 text-center text-xs font-semibold">
                {resumeLabel}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => onDiscard(row)}
                className="flex-1 rounded-lg border border-red-400/40 py-2 text-xs font-semibold text-red-500 disabled:opacity-60"
              >
                {discardLabel}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
