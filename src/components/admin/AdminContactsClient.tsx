"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MailOpen, MessageSquare } from "lucide-react";

import { DsPageHeader } from "@/design-system";

type ContactRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  message: string;
  status: "new" | "read";
  source: string | null;
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

export function AdminContactsClient() {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/contacts")
      .then((r) => r.json())
      .then((j) => setRows((j.messages ?? []) as ContactRow[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "new" | "read") {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch(`/api/admin/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    }).catch(() => load());
  }

  return (
    <div className="space-y-5">
      <DsPageHeader
        title="Mensagens de contato"
        subtitle="Mensagens enviadas pelos formulários de contato."
        titleIcon={<MessageSquare size={16} />}
      />

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-shimmer h-20 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-10 text-center text-sm text-[var(--text-dim)]">
          Nenhuma mensagem ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`campaign-creator-card campaign-creator-card--compact ${
                row.status === "new" ? "ring-1 ring-[var(--ui-accent-border)]" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {row.status === "new" ? (
                      <span className="ds-table-compact-badge ds-table-compact-badge--accent">Nova</span>
                    ) : null}
                    <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{row.subject}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-dim)]">
                    {row.name} ·{" "}
                    <a href={`mailto:${row.email}`} className="text-[var(--ui-accent)] hover:underline">
                      {row.email}
                    </a>
                    {row.company ? ` · ${row.company}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-[var(--text-dimmer)]">{formatDate(row.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => setStatus(row.id, row.status === "new" ? "read" : "new")}
                    className="ui-btn-accent-outline inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-heading font-semibold"
                  >
                    {row.status === "new" ? <MailOpen size={13} /> : <Mail size={13} />}
                    {row.status === "new" ? "Marcar como lida" : "Marcar como nova"}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-dim)]">{row.message}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
