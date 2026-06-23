"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Building2, ExternalLink, Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { IconLabelLink } from "@/components/ui/IconLabelButton";
import { toUxClientCards } from "@/uxpilot-ui/adapters/clients-mappers";
import { useClientsData } from "@/uxpilot-ui/adapters/useClientsData";
import { UxFloatingActionBar } from "@/uxpilot-ui/adapters/UxFloatingActionBar";

function StatusPill({ status, alertCount }: { status: "healthy" | "warning"; alertCount: number }) {
  const healthy = status === "healthy";
  return (
    <span
      className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{
        background: healthy ? "rgba(16,185,129,0.12)" : "rgba(245,166,35,0.12)",
        color: healthy ? "#10b981" : "#f5a623",
        border: `1px solid ${healthy ? "rgba(16,185,129,0.25)" : "rgba(245,166,35,0.25)"}`
      }}
    >
      {healthy ? "Saudável" : `${alertCount} alerta${alertCount === 1 ? "" : "s"}`}
    </span>
  );
}

export function ClientsContentLive() {
  const t = useTranslations("clientsHub");
  const router = useRouter();
  const data = useClientsData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cards = useMemo(() => toUxClientCards(data.clients, data.locale), [data.clients, data.locale]);
  const selectedClient = cards.find((c) => c.id === selectedId) ?? null;

  const trailingSlot = useMemo(
    () => (
      <IconLabelLink
        href="/clients/new"
        label="Novo Cliente"
        icon={<Plus size={16} />}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold shadow-md transition-all hover:brightness-110 active:scale-95 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1.5"
        style={{
          background: "linear-gradient(135deg, #f5a623, #e8920d)",
          color: "#0f1419",
          fontFamily: "var(--font-heading)"
        }}
      />
    ),
    []
  );

  useCommandStripPage({
    hideFilters: true,
    hideSync: true,
    searchPlaceholder: "Buscar clientes...",
    searchValue: data.search,
    onSearchChange: data.setSearch,
    trailingSlot
  });

  return (
    <>
      <div>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "rgba(245,166,35,0.15)" }}
          >
            <Building2 size={16} style={{ color: "#f5a623" }} />
          </div>
          <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
            {t("title")}
          </h1>
        </div>
        <p className="mt-1 font-body text-xs" style={{ color: "var(--text-dim)" }}>
          {cards.length} {cards.length === 1 ? "cliente" : "clientes"}
        </p>
      </div>

      {data.message ? <div className="ui-alert-info text-sm">{data.message}</div> : null}

      {data.loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border"
              style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
            />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
            {t("subtitle")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((client, i) => (
            <div
              key={client.id}
              className="group kpi-card-hover animate-fade-up cursor-pointer overflow-hidden rounded-xl border transition-all"
              style={{
                background: "var(--surface-card)",
                borderColor: selectedId === client.id ? "#f5a623" : "var(--border-color)",
                animationDelay: `${i * 80}ms`,
                animationFillMode: "both"
              }}
              onClick={() => setSelectedId((prev) => (prev === client.id ? null : client.id))}
            >
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${client.color}, transparent)` }} />
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <Link href={`/clients/${client.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-heading text-lg font-bold"
                      style={{ background: `${client.color}20`, border: `1px solid ${client.color}30` }}
                    >
                      <span style={{ color: client.color }}>{client.logo}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
                        {client.name}
                      </h3>
                      <p className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                        {client.subtitle}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <StatusPill status={client.status} alertCount={client.alertCount} />
                    <Link
                      href={`/clients/${client.slug}`}
                      className="rounded-lg p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: "var(--text-dim)" }}
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-3 gap-2">
                  {[
                    { label: client.budgetLabel, value: client.budgetValue, color: "#f5a623" },
                    { label: "ROAS", value: client.roasValue, color: "#10b981" },
                    { label: "CPL", value: client.cplValue, color: "var(--text-dim)" }
                  ].map((k) => (
                    <div
                      key={k.label}
                      className="rounded-lg p-2 text-center"
                      style={{ background: "var(--surface-thead)" }}
                    >
                      <div className="font-heading text-sm font-bold" style={{ color: k.color }}>
                        {k.value}
                      </div>
                      <div className="mt-0.5 font-body text-[10px]" style={{ color: "var(--text-dimmer)" }}>
                        {k.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                    {client.accounts} {client.accounts === 1 ? "conta conectada" : "contas conectadas"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {client.status === "healthy" ? (
                      <TrendingUp size={12} style={{ color: "#10b981" }} />
                    ) : (
                      <TrendingDown size={12} style={{ color: "#f5a623" }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UxFloatingActionBar open={!!selectedClient} onClose={() => setSelectedId(null)}>
        {selectedClient ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
              {selectedClient.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/clients/${selectedClient.slug}`)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                <ExternalLink size={13} />
                Ver cliente
              </button>
              <button
                type="button"
                onClick={() => router.push(`/clients/${selectedClient.slug}/settings`)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                type="button"
                disabled={data.isPending}
                onClick={() => {
                  const row = data.allClients.find((c) => c.id === selectedClient.id);
                  if (row) data.deleteClient(row);
                  setSelectedId(null);
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-body text-xs font-semibold disabled:opacity-50"
                style={{ borderColor: "rgba(239,68,68,0.35)", color: "#ef4444" }}
              >
                <Trash2 size={13} />
                Excluir
              </button>
            </div>
          </div>
        ) : null}
      </UxFloatingActionBar>
    </>
  );
}
