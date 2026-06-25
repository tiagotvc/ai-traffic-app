"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Building2, Cog, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";

import { PageToolbar } from "@/components/layout/PageToolbar";
import { IconLabelLink } from "@/components/ui/IconLabelButton";
import { useRouter } from "@/i18n/navigation";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { DsButton, DsModal } from "@/design-system";
import { toUxClientCards, type UxClientCard } from "@/uxpilot-ui/adapters/clients-mappers";
import { useClientsData } from "@/uxpilot-ui/adapters/useClientsData";

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
  const tCommon = useTranslations("common");
  const router = useRouter();
  const data = useClientsData();
  const cards = useMemo(() => toUxClientCards(data.clients, data.locale), [data.clients, data.locale]);

  const [confirmClient, setConfirmClient] = useState<UxClientCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  useCommandStripPage({ hideFilters: true, hideSync: true });

  async function handleConfirmDelete() {
    if (!confirmClient) return;
    setDeleting(true);
    const ok = await data.deleteClientConfirmed(confirmClient.id);
    setDeleting(false);
    setConfirmClient(null);
    if (ok) {
      data.setSearch("");
    }
  }

  return (
    <>
      <PageToolbar
        icon={<Building2 size={16} />}
        title={t("title")}
        subtitle={`${cards.length} ${cards.length === 1 ? "cliente" : "clientes"}`}
        showGlobalFilters={false}
        showSync={false}
        search={{
          value: data.search,
          onChange: data.setSearch,
          placeholder: "Buscar clientes..."
        }}
        actions={
          <IconLabelLink
            href="/clients/new"
            label={t("addClient")}
            icon={<Plus size={16} />}
            className="ui-btn-accent"
          />
        }
      />

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
          className="rounded-xl border p-10 text-center"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <h3 className="font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
            Cadastre seu primeiro cliente
          </h3>
          <p className="mt-2 font-body text-sm" style={{ color: "var(--text-dim)" }}>
            {t("subtitle")}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/clients/new"
              className="ui-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-heading text-sm font-semibold"
            >
              <Plus size={16} />
              Novo cliente
            </Link>
            {process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? (
              <button
                type="button"
                onClick={() => {
                  void fetch("/api/seed/demo", { method: "POST" })
                    .then((r) => {
                      if (r.ok) {
                        window.dispatchEvent(new Event("traffic:campaigns-reload"));
                        void data.reload();
                      }
                    })
                    .catch(() => {});
                }}
                className="ui-btn-secondary rounded-xl px-5 py-2.5 font-heading text-sm font-semibold"
              >
                Carregar dados demo
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((client, i) => {
            const protectedClient = data.isProtected(client.name, client.slug);
            return (
              <div
                key={client.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/clients/${client.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/clients/${client.slug}`);
                  }
                }}
                className="group kpi-card-hover animate-fade-up cursor-pointer overflow-hidden rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                style={{
                  background: "var(--surface-card)",
                  borderColor: "var(--border-color)",
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: "both"
                }}
              >
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${client.color}, transparent)` }} />
                <div className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
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
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={client.status} alertCount={client.alertCount} />
                      {protectedClient ? null : (
                        <button
                          type="button"
                          title={t("deleteClient")}
                          aria-label={t("deleteClient")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmClient(client);
                          }}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-dimmer)] opacity-0 transition-all hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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
                    {client.status === "healthy" ? (
                      <TrendingUp size={12} style={{ color: "#10b981" }} />
                    ) : (
                      <TrendingDown size={12} style={{ color: "#f5a623" }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <DsModal
        open={!!confirmClient}
        onClose={() => (deleting ? undefined : setConfirmClient(null))}
        title={t("deleteClient")}
        titleIcon={<Trash2 size={16} />}
        width="sm"
        footer={
          <>
            <DsButton variant="secondary" size="sm" onClick={() => setConfirmClient(null)} disabled={deleting}>
              {tCommon("cancel")}
            </DsButton>
            <DsButton variant="danger" size="sm" onClick={() => void handleConfirmDelete()} disabled={deleting}>
              {t("deleteClient")}
            </DsButton>
          </>
        }
      >
        <p className="text-sm text-[var(--text-dim)]">
          {confirmClient ? t("deleteConfirm", { name: confirmClient.name }) : ""}
        </p>
      </DsModal>

      {/* Overlay de carregamento (mesma animação da criação de campanha) */}
      {deleting ? (
        <div
          className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center"
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
        >
          <div className="absolute inset-0 bg-[#05080c]/85 backdrop-blur-lg" aria-hidden />
          <div className="ui-card relative z-10 mx-4 w-full max-w-sm px-8 py-10 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-[var(--surface-thead)]">
              <Cog size={38} className="animate-spin text-[var(--ui-accent)]" strokeWidth={1.6} aria-hidden />
            </div>
            <h2 className="font-heading text-lg text-[var(--text-main)]">Excluindo cliente…</h2>
            <p className="mt-2 text-sm text-[var(--text-dim)]">Aguarde um instante.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
