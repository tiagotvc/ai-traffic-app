"use client";

import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import {
  Building2,
  Facebook,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp
} from "lucide-react";

import { PageToolbar } from "@/components/layout/PageToolbar";
import { IconLabelLink } from "@/components/ui/IconLabelButton";
import { OrionActionLoadingOverlay } from "@/components/ui/OrionActionLoadingOverlay";
import { Link, useRouter } from "@/i18n/navigation";
import { useCommandStripPage } from "@/components/layout/useCommandStripPage";
import { DsButton, DsInfoBanner, DsModal } from "@/design-system";
import { cn } from "@/lib/cn";
import { getCampaignPresetIconConfig } from "@/lib/campaign-preset-icons";
import { toUxClientCards, type UxClientCard } from "@/uxpilot-ui/adapters/clients-mappers";
import { useClientsData } from "@/uxpilot-ui/adapters/useClientsData";

type MetricTileVariant = "purple" | "neutral";

const METRIC_TILE_STYLES: Record<
  MetricTileVariant,
  { bg: string; border: string; label: string; value: string }
> = {
  purple: {
    bg: "color-mix(in srgb, var(--ui-accent-muted) 65%, var(--creator-card-bg, var(--surface-card)))",
    border: "1px solid var(--ui-accent-border)",
    label: "var(--ui-accent)",
    value: "var(--ui-accent)"
  },
  neutral: {
    bg: "color-mix(in srgb, var(--creator-card-bg, var(--surface-card)) 92%, var(--border-color))",
    border: "1px solid var(--creator-card-border, var(--border-color))",
    label: "var(--text-dimmer)",
    value: "var(--text-main)"
  }
};

function StatusPill({
  status,
  alertCount,
  healthyLabel,
  alertLabel
}: {
  status: "healthy" | "warning";
  alertCount: number;
  healthyLabel: string;
  alertLabel: string;
}) {
  const healthy = status === "healthy";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wide",
        healthy
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
          : "border border-amber-500/25 bg-amber-500/10 text-amber-500"
      )}
    >
      {healthy ? healthyLabel : alertLabel}
    </span>
  );
}

function ClientMetricTile({
  label,
  value,
  variant
}: {
  label: string;
  value: string;
  variant: MetricTileVariant;
}) {
  const s = METRIC_TILE_STYLES[variant];
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center rounded-lg px-2 py-2 text-center"
      style={{ background: s.bg, border: s.border }}
    >
      <div className="font-heading text-sm font-bold tabular-nums" style={{ color: s.value }}>
        {value}
      </div>
      <div
        className="mt-0.5 font-body text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: s.label }}
      >
        {label}
      </div>
    </div>
  );
}

function ClientIntegrationsRow({
  client,
  t
}: {
  client: UxClientCard;
  t: ReturnType<typeof useTranslations<"clientsHub">>;
}) {
  const detailParts: string[] = [];
  if (client.accounts > 0) {
    detailParts.push(t("integrationAccounts", { count: client.accounts }));
  }
  if (client.pixelCount > 0) {
    detailParts.push(t("integrationPixels", { count: client.pixelCount }));
  }
  if (client.hasPage) {
    detailParts.push(t("integrationPageLinked"));
  }

  const anyConnected = client.metaConnected || client.googleConnected;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
      {client.metaConnected ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-main)]">
          <Facebook size={12} aria-hidden className="text-[var(--ui-accent)]" />
          {t("metaConnectedShort")}
        </span>
      ) : null}
      {client.googleConnected ? (
        <>
          {client.metaConnected ? (
            <span className="text-[var(--text-dimmer)]" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-main)]">
            <GoogleGlyph size={12} />
            {t("googleConnectedShort")}
          </span>
        </>
      ) : null}
      {!anyConnected ? (
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-dim)]">
          <Facebook size={12} aria-hidden className="text-[var(--text-dimmer)]" />
          {t("notConnectedShort")}
        </span>
      ) : null}
      {detailParts.map((part) => (
        <Fragment key={part}>
          <span className="text-[var(--text-dimmer)]" aria-hidden>
            ·
          </span>
          <span className="text-[var(--text-dim)]">{part}</span>
        </Fragment>
      ))}
    </div>
  );
}

function GoogleGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
      />
    </svg>
  );
}

function ClientGoalRow({ preset, label }: { preset: string; label: string }) {
  const { Icon: PresetIcon } = getCampaignPresetIconConfig(preset);
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
        <PresetIcon size={14} aria-hidden />
      </span>
      <span className="truncate font-body text-sm text-[var(--text-main)]">{label}</span>
    </div>
  );
}

export function ClientsContentLive() {
  const t = useTranslations("clientsHub");
  const tPresets = useTranslations("campaignPresets");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const data = useClientsData();
  const cards = useMemo(() => toUxClientCards(data.clients, data.locale), [data.clients, data.locale]);

  const [confirmClient, setConfirmClient] = useState<UxClientCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  useCommandStripPage({ hideFilters: true, hideSync: true });

  function presetLabel(preset: string) {
    if (preset.startsWith("custom:")) return preset.slice("custom:".length);
    try {
      return tPresets(preset as "default");
    } catch {
      return preset;
    }
  }

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
    <div data-dashboard-shell className="contents">
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

      {data.message ? (
        <DsInfoBanner className="px-4 py-2.5 text-sm">{data.message}</DsInfoBanner>
      ) : null}

      {data.loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="campaign-creator-card h-48 animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="campaign-creator-card p-10 text-center">
          <h3 className="font-heading text-lg font-bold text-[var(--text-main)]">
            Cadastre seu primeiro cliente
          </h3>
          <p className="mt-2 font-body text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/clients/new"
              className="ui-btn-accent inline-flex items-center gap-2 px-5 py-2.5 font-heading text-sm font-semibold"
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
                className="ui-btn-secondary px-5 py-2.5 font-heading text-sm font-semibold"
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
                className="campaign-creator-card kpi-card-hover animate-fade-up cursor-pointer text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)]"
                style={{
                  animationDelay: `${i * 80}ms`,
                  animationFillMode: "both"
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] font-heading text-lg font-bold text-[var(--ui-accent)]">
                      {client.logo}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-base font-semibold text-[var(--text-main)]">
                        {client.name}
                      </h3>
                      <p className="font-body text-xs text-[var(--text-dim)]">
                        {t("adAccountsSubtitle", { count: client.accounts })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill
                      status={client.status}
                      alertCount={client.alertCount}
                      healthyLabel={t("statusHealthy")}
                      alertLabel={t("alertCount", { count: client.alertCount })}
                    />
                    {protectedClient ? null : (
                      <button
                        type="button"
                        title={t("deleteClient")}
                        aria-label={t("deleteClient")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmClient(client);
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-card-border,var(--border-color))] text-[var(--text-dimmer)] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="campaign-creator-orion-section-label mb-1.5">{t("integrationsSection")}</p>
                  <ClientIntegrationsRow client={client} t={t} />
                </div>

                <div className="mt-2.5">
                  <p className="campaign-creator-orion-section-label mb-1.5">{t("goalSection")}</p>
                  <ClientGoalRow preset={client.dominantPreset} label={presetLabel(client.dominantPreset)} />
                </div>

                <div className="mt-3 flex gap-2">
                  <ClientMetricTile label={client.budgetLabel} value={client.budgetValue} variant="purple" />
                  <ClientMetricTile label="ROAS" value={client.roasValue} variant="neutral" />
                  <ClientMetricTile label="CPL" value={client.cplValue} variant="neutral" />
                </div>

                <div className="mt-2 flex items-center justify-end">
                  {client.status === "healthy" ? (
                    <TrendingUp size={12} className="text-emerald-500" />
                  ) : (
                    <TrendingDown size={12} className="text-amber-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      <OrionActionLoadingOverlay
        open={deleting}
        title={t("deleteLoadingTitle")}
        message={t("deleteLoadingMessage")}
        subtitle={tCommon("pleaseWait")}
        ariaLabelledBy="client-delete-loading-title"
      />
    </div>
  );
}
