"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/Badge";

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
  account_id?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  summary: Summary | null;
  clientSlug: string;
  adAccountId: string;
};

function kindBadge(kind: string) {
  if (kind === "lookalike") return "brand" as const;
  if (kind === "engagement") return "warning" as const;
  if (kind === "app") return "neutral" as const;
  return "success" as const;
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
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
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
    const qs = new URLSearchParams({
      clientId: clientSlug,
      adAccountId
    });
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

  const spec =
    detail?.lookalike_spec && typeof detail.lookalike_spec === "object"
      ? (detail.lookalike_spec as Record<string, unknown>)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{t("detailTitle")}</h2>
            <p className="mt-1 truncate text-sm text-slate-600">{summary.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">{t("detailLoading")}</p>
        ) : error ? (
          <p className="mt-6 text-sm text-red-600">{error}</p>
        ) : (
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">{t("detailKind")}</dt>
              <dd>
                <Badge variant={kindBadge(summary.kind)}>{t(`kind.${summary.kind}`)}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailId")}</dt>
              <dd className="max-w-[14rem] truncate font-mono text-xs text-slate-700">{summary.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailSubtype")}</dt>
              <dd>{detail?.subtype ?? summary.subtype ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailClient")}</dt>
              <dd>{summary.clientName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailAdAccount")}</dt>
              <dd className="max-w-[14rem] truncate font-mono text-xs">{summary.adAccountId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailSize")}</dt>
              <dd>
                {formatSize(
                  detail?.approximate_count_lower_bound,
                  detail?.approximate_count_upper_bound,
                  summary.approximateCount
                )}
              </dd>
            </div>
            {summary.ratioPct != null ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t("detailRatio")}</dt>
                <dd>{summary.ratioPct}%</dd>
              </div>
            ) : null}
            {summary.country ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t("detailCountry")}</dt>
                <dd>{summary.country}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailDelivery")}</dt>
              <dd>{detail?.delivery_status?.description ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailOperation")}</dt>
              <dd>{detail?.operation_status?.description ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailCreated")}</dt>
              <dd>{formatDate(detail?.time_created)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("detailUpdated")}</dt>
              <dd>{formatDate(detail?.time_updated)}</dd>
            </div>
            {detail?.description ? (
              <div>
                <dt className="text-slate-500">{t("detailDescription")}</dt>
                <dd className="mt-1 rounded-lg bg-slate-50 p-2 text-slate-700">{detail.description}</dd>
              </div>
            ) : null}
            {spec ? (
              <div>
                <dt className="text-slate-500">{t("detailLookalikeSpec")}</dt>
                <dd className="mt-1 overflow-x-auto rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-700">
                  {JSON.stringify(spec, null, 2)}
                </dd>
              </div>
            ) : null}
          </dl>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="ui-btn-primary text-sm">
            {t("detailClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
