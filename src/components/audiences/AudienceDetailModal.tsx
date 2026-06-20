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
  X,
  Zap
} from "lucide-react";

import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { summarizeAudienceRule } from "@/lib/meta-audience-rule-summary";

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

function kindStyle(kind: string) {
  if (kind === "lookalike") return { bg: "rgba(16,185,129,0.12)", color: "#10b981" };
  if (kind === "engagement") return { bg: "rgba(245,166,35,0.13)", color: "#f59e0b" };
  return { bg: "rgba(79,70,229,0.12)", color: "#818cf8" };
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
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: highlight ? "rgba(245,166,35,0.06)" : "var(--surface-bg)",
        border: highlight ? "1px solid rgba(245,166,35,0.2)" : "1px solid var(--border-color)"
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={13} style={{ color: highlight ? "#f5a623" : "#f5a623" }} />
        <span className="font-body text-[11px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
          {label}
        </span>
      </div>
      <p
        className={`truncate font-heading text-sm font-semibold ${highlight ? "text-[#f5a623]" : ""}`}
        style={{ color: highlight ? undefined : "var(--text-main)" }}
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

  if (!open || !summary) return null;

  const kind = kindStyle(summary.kind);
  const ruleSummary = detail?.rule ? summarizeAudienceRule(detail.rule) : null;
  const deliveryOk = (detail?.delivery_status?.code ?? 200) === 200;
  const size = formatSize(
    detail?.approximate_count_lower_bound,
    detail?.approximate_count_upper_bound,
    summary.approximateCount
  );

  return (
    <UxModalPortal open={open} onClose={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b px-6 pb-5 pt-6" style={{ borderColor: "var(--border-color)" }}>
          <div
            className="absolute left-0 right-0 top-0 h-[3px] rounded-t-2xl"
            style={{ background: "linear-gradient(90deg, #f5a623, #f59e0b88)" }}
          />
          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)" }}
              >
                <Users size={18} style={{ color: "#f5a623" }} />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-base font-bold leading-tight" style={{ color: "var(--text-main)" }}>
                  {t("detailTitle")}
                </h2>
                <p className="mt-0.5 truncate font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                  {summary.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
            >
              <X size={14} style={{ color: "var(--text-dim)" }} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-3 py-1 font-heading text-[11px] font-semibold"
              style={{ background: kind.bg, color: kind.color, border: `1px solid ${kind.color}30` }}
            >
              {t(`kind.${summary.kind}`)}
            </span>
            {summary.subtype ? (
              <span
                className="rounded-full px-3 py-1 font-body text-[11px] font-medium"
                style={{ background: "rgba(236,72,153,0.1)", color: "#f472b6", border: "1px solid rgba(236,72,153,0.15)" }}
              >
                {summary.subtype}
              </span>
            ) : null}
          </div>
        </div>

        <div className="max-h-[calc(90vh-10rem)] space-y-5 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              {t("detailLoading")}
            </p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MetaCard icon={Hash} label={t("detailId")} value={summary.id} />
                <MetaCard icon={Layers} label={t("detailSubtype")} value={detail?.subtype ?? summary.subtype ?? "—"} />
                <MetaCard icon={Users} label={t("detailClient")} value={summary.clientName} />
                <MetaCard icon={MapPin} label={t("detailCountry")} value={summary.country ?? "BR"} />
              </div>

              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
              >
                <Shield size={14} style={{ color: "#818cf8" }} />
                <div className="min-w-0">
                  <span className="block font-body text-[11px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
                    {t("detailAdAccount")}
                  </span>
                  <span className="block truncate font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {detail?.account_id ?? summary.adAccountId}
                  </span>
                </div>
              </div>

              <MetaCard icon={Activity} label={t("detailSize")} value={size} highlight />

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--surface-bg)",
                    border: `1px solid ${deliveryOk ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}`
                  }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{
                        background: deliveryOk ? "#10b981" : "#ef4444",
                        boxShadow: `0 0 6px ${deliveryOk ? "#10b98180" : "#ef444480"}`
                      }}
                    />
                    <span className="font-body text-[11px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
                      {t("detailDelivery")}
                    </span>
                  </div>
                  <p className="font-body text-xs font-semibold leading-snug" style={{ color: deliveryOk ? "#10b981" : "#ef4444" }}>
                    {detail?.delivery_status?.description ?? "—"}
                  </p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--surface-bg)", border: "1px solid rgba(245,166,35,0.2)" }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Zap size={12} style={{ color: "#f5a623" }} />
                    <span className="font-body text-[11px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
                      {t("detailOperation")}
                    </span>
                  </div>
                  <p className="line-clamp-3 font-body text-xs leading-snug" style={{ color: "#f5a623" }}>
                    {detail?.operation_status?.description ?? "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
                >
                  <CalendarDays size={13} style={{ color: "var(--text-dimmer)" }} />
                  <div>
                    <span className="block font-body text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
                      {t("detailCreated")}
                    </span>
                    <span className="font-heading text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                      {formatDate(detail?.time_created)}
                    </span>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
                >
                  <Clock size={13} style={{ color: "var(--text-dimmer)" }} />
                  <div>
                    <span className="block font-body text-[10px] uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>
                      {t("detailUpdated")}
                    </span>
                    <span className="font-heading text-xs font-semibold" style={{ color: "var(--text-main)" }}>
                      {formatDate(detail?.time_updated)}
                    </span>
                  </div>
                </div>
              </div>

              {ruleSummary ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ background: "rgba(79,70,229,0.15)" }}
                    >
                      <Layers size={11} style={{ color: "#818cf8" }} />
                    </div>
                    <span className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {t("detailRule")}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(79,70,229,0.2)" }}>
                    <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(79,70,229,0.1)" }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#818cf8" }} />
                      <span className="font-heading text-xs font-semibold" style={{ color: "#818cf8" }}>
                        {ruleSummary.kind === "website"
                          ? t("ruleKind.website")
                          : ruleSummary.kind === "engagement"
                            ? t("ruleKind.engagement")
                            : ruleSummary.kind === "combined"
                              ? t("ruleKind.combined")
                              : t("detailRule")}
                      </span>
                    </div>
                    <div className="space-y-1 px-4 py-3 font-body text-xs" style={{ color: "var(--text-dim)" }}>
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
            </>
          )}
        </div>
      </div>
    </UxModalPortal>
  );
}
