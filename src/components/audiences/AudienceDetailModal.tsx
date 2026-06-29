"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  CalendarDays,
  Clock,
  Hash,
  Layers,
  MapPin,
  Shield,
  Users,
  Zap
} from "lucide-react";

import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
import { summarizeAudienceRule } from "@/lib/meta-audience-rule-summary";
import { cn } from "@/lib/cn";

type Summary = {
  id: string;
  name: string;
  kind: string;
  subtype?: string;
  clientName: string;
  adAccountId: string;
  country?: string;
  ratioPct?: number;
  approximateCount?: number;
};

type Detail = {
  id: string;
  name?: string;
  subtype?: string;
  description?: string;
  delivery_status?: { code?: number; description?: string };
  operation_status?: { code?: number; description?: string };
  time_created?: string;
  time_updated?: string;
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  lookalike_spec?: unknown;
  rule?: unknown;
  account_id?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  summary: Summary | null;
  clientSlug: string;
  adAccountId: string;
};

function kindCompactBadge(kind: string) {
  if (kind === "lookalike") return "ds-table-compact-badge--success";
  if (kind === "engagement") return "ds-table-compact-badge--accent";
  return "ds-table-compact-badge--neutral";
}

function formatSize(lower?: number, upper?: number, fallback?: number) {
  if (lower != null && upper != null && lower >= 0 && upper >= 0) {
    if (lower === upper) return lower.toLocaleString();
    return `${lower.toLocaleString()} – ${upper.toLocaleString()}`;
  }
  if (upper != null && upper >= 0) return `~${upper.toLocaleString()}`;
  if (lower != null && lower >= 0) return `~${lower.toLocaleString()}`;
  if (fallback != null && fallback >= 0) return `~${fallback.toLocaleString()}`;
  return "—";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
  return d.toLocaleString();
}

function MetaCard({
  icon: Icon,
  label,
  value,
  highlight = false
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "campaign-creator-card campaign-creator-card--compact p-3",
        highlight && "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
      )}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon size={12} className={highlight ? "text-[var(--ui-accent)]" : "text-[var(--text-dimmer)]"} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">{label}</span>
      </div>
      <p
        className={cn(
          "truncate font-heading text-xs font-semibold text-[var(--text-main)]",
          highlight && "text-[var(--ui-accent)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function AudienceDetailModal({ open, onClose, summary, clientSlug, adAccountId }: Props) {
  const t = useTranslations("audiences");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    if (!open || !summary) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ clientId: clientSlug, adAccountId });
    fetch(`/api/meta/audiences/${encodeURIComponent(summary.id)}?${qs}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; audience?: Detail; error?: string }) => {
        if (!j.ok || !j.audience) throw new Error(j.error ?? "loadFailed");
        setDetail(j.audience);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "loadFailed");
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [open, summary, clientSlug, adAccountId]);

  if (!summary) return null;

  const ruleSummary = detail?.rule ? summarizeAudienceRule(detail.rule) : null;
  const deliveryOk = (detail?.delivery_status?.code ?? 200) === 200;
  const size = formatSize(
    detail?.approximate_count_lower_bound,
    detail?.approximate_count_upper_bound,
    summary.approximateCount
  );

  return (
    <>
      <OrionTrafficLoadingOverlay
        open={open && loading}
        title={t("detailLoading")}
        message={t("metaTableLoadingHint")}
        ariaLabelledBy="audience-detail-loading-title"
      />
      <CreatorModalShell
      open={open}
      onClose={onClose}
      title={t("detailTitle")}
      subtitle={summary.name}
      titleIcon={<Users size={16} />}
      width="lg"
      hideFooter
    >
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className={cn("ds-table-compact-badge", kindCompactBadge(summary.kind))}>
          {t(`kind.${summary.kind}`)}
        </span>
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <MetaCard icon={Hash} label={t("detailId")} value={summary.id} />
            <MetaCard icon={Layers} label={t("detailSubtype")} value={detail?.subtype ?? summary.subtype ?? "—"} />
            <MetaCard icon={Users} label={t("detailClient")} value={summary.clientName} />
            <MetaCard icon={MapPin} label={t("detailCountry")} value={summary.country ?? "BR"} />
          </div>

          <div className="campaign-creator-card campaign-creator-card--compact flex items-center gap-3 p-3">
            <Shield size={14} className="shrink-0 text-[var(--ui-accent)]" />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("detailAdAccount")}
              </span>
              <span className="block truncate font-heading text-xs font-semibold text-[var(--text-main)]">
                {detail?.account_id ?? summary.adAccountId}
              </span>
            </div>
          </div>

          <MetaCard icon={Activity} label={t("detailSize")} value={size} highlight />

          <div className="grid grid-cols-2 gap-2.5">
            <div
              className={cn(
                "campaign-creator-card campaign-creator-card--compact p-3",
                deliveryOk ? "border-emerald-500/25" : "border-red-500/25"
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <div
                  className={cn("h-1.5 w-1.5 rounded-full", deliveryOk ? "bg-emerald-500" : "bg-red-500")}
                />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("detailDelivery")}
                </span>
              </div>
              <p className={cn("text-xs font-semibold leading-snug", deliveryOk ? "text-emerald-500" : "text-red-500")}>
                {detail?.delivery_status?.description ?? "—"}
              </p>
            </div>
            <div className="campaign-creator-card campaign-creator-card--compact border-[var(--ui-accent-border)] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Zap size={12} className="text-[var(--ui-accent)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("detailOperation")}
                </span>
              </div>
              <p className="line-clamp-3 text-xs leading-snug text-[var(--ui-accent)]">
                {detail?.operation_status?.description ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="campaign-creator-card campaign-creator-card--compact flex items-center gap-2.5 p-3">
              <CalendarDays size={13} className="shrink-0 text-[var(--text-dimmer)]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("detailCreated")}
                </span>
                <span className="font-heading text-xs font-semibold text-[var(--text-main)]">
                  {formatDate(detail?.time_created)}
                </span>
              </div>
            </div>
            <div className="campaign-creator-card campaign-creator-card--compact flex items-center gap-2.5 p-3">
              <Clock size={13} className="shrink-0 text-[var(--text-dimmer)]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                  {t("detailUpdated")}
                </span>
                <span className="font-heading text-xs font-semibold text-[var(--text-main)]">
                  {formatDate(detail?.time_updated)}
                </span>
              </div>
            </div>
          </div>

          {ruleSummary ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--ui-accent-muted)]">
                  <Layers size={11} className="text-[var(--ui-accent)]" />
                </div>
                <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("detailRule")}</span>
              </div>
              <div className="campaign-creator-card campaign-creator-card--compact overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b border-[var(--creator-card-border)] bg-[var(--ui-accent-muted)] px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--ui-accent)]" />
                  <span className="font-heading text-xs font-semibold text-[var(--ui-accent)]">
                    {ruleSummary.kind === "website"
                      ? t("ruleKind.website")
                      : ruleSummary.kind === "engagement"
                        ? t("ruleKind.engagement")
                        : ruleSummary.kind === "combined"
                          ? t("ruleKind.combined")
                          : t("detailRule")}
                  </span>
                </div>
                <div className="space-y-1 px-3 py-2.5 text-xs text-[var(--text-dim)]">
                  {ruleSummary.sourceType ? <div>Fonte: {ruleSummary.sourceType}</div> : null}
                  {ruleSummary.eventName ? <div>Ação: {ruleSummary.eventName}</div> : null}
                  {ruleSummary.pixelId ? <div>Pixel: {ruleSummary.pixelId}</div> : null}
                  {ruleSummary.retentionDays != null ? (
                    <div>
                      {t("retentionDays")}: {ruleSummary.retentionDays}d
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </CreatorModalShell>
    </>
  );
}
