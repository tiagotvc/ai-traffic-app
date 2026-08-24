"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Mail, RotateCw, XCircle } from "lucide-react";

import { DsPageHeader } from "@/design-system";

type EmailLogRow = {
  id: string;
  tenantId: string;
  kind: string;
  to: string;
  sent: boolean;
  error: string | null;
  createdAt: string;
};

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

export function AdminEmailLogsClient() {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/email-logs")
      .then((r) => r.json())
      .then((j) => setRows((j.logs ?? []) as EmailLogRow[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resend(id: string) {
    setResendingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/email-logs/${id}/resend`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? "Falha ao reenviar");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao reenviar");
    } finally {
      setResendingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <DsPageHeader
        title="E-mails transacionais"
        subtitle="Tentativas de envio (ex.: boas-vindas na ativação de assinatura) e reenvio manual."
        titleIcon={<Mail size={16} />}
      />

      {error ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-10 text-center text-sm text-[var(--text-dim)]">
          Nenhuma tentativa de envio ainda.
        </div>
      ) : (
        <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 border-b border-[var(--creator-card-border)] p-4 last:border-0"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  row.sent ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}
              >
                {row.sent ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm font-semibold text-[var(--text-main)]">{row.to}</span>
                  <span
                    className={
                      row.sent
                        ? "ds-table-compact-badge ds-table-compact-badge--success"
                        : "ds-table-compact-badge ds-table-compact-badge--neutral"
                    }
                  >
                    {row.sent ? "Enviado" : "Falhou"}
                  </span>
                  <span className="font-body text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">
                    {row.kind}
                  </span>
                </div>
                <p className="mt-0.5 font-body text-[11px] text-[var(--text-dimmer)]">
                  {formatDate(row.createdAt)}
                  {row.error ? ` · ${row.error}` : ""}
                </p>
              </div>
              {!row.sent ? (
                <button
                  type="button"
                  onClick={() => void resend(row.id)}
                  disabled={resendingId === row.id}
                  className="ui-btn-accent inline-flex h-8 shrink-0 items-center justify-center gap-1.5 px-3 font-heading text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCw size={13} className={resendingId === row.id ? "animate-spin" : ""} />
                  Reenviar
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
