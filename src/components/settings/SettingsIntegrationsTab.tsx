"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Database, User, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { MetaSetupCallout } from "@/components/MetaSetupCallout";
import { DsFlatSection } from "@/design-system";
import { cn } from "@/lib/cn";

type WorkspaceMetaInfo = {
  ok: true;
  workspaceConnectionUserId: string | null;
  workspaceConnectionName: string | null;
  isOwner: boolean;
  canManage: boolean;
};

function SoonBadge({ tone }: { tone: "emerald" | "sky" }) {
  const t = useTranslations("settings");
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-sky-500/15 text-sky-400";

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", toneClass)}>
      {t("integrationComingSoon")}
    </span>
  );
}

function ComingSoonCard({
  name,
  description,
  icon,
  badgeTone
}: {
  name: string;
  description: string;
  icon: ReactNode;
  badgeTone: "emerald" | "sky";
}) {
  return (
    <article className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{name}</h3>
            <SoonBadge tone={badgeTone} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">{description}</p>
        </div>
      </div>
    </article>
  );
}

export function SettingsIntegrationsTab({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot,
  googleAdsEnabled = false
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
  /** Resolvido no servidor (isGoogleAdsEnabled). Decide o card sem flash de "em breve". */
  googleAdsEnabled?: boolean;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [wsMeta, setWsMeta] = useState<WorkspaceMetaInfo | null>(null);
  const [wsMetaMessage, setWsMetaMessage] = useState<string | null>(null);
  const [wsMetaPending, startWsMetaTransition] = useTransition();
  // null = status ainda carregando (badge "carregando"); o card já é escolhido pela prop.
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);

  const loadWorkspaceMeta = useCallback(() => {
    fetch("/api/settings/workspace-meta")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setWsMeta(j as WorkspaceMetaInfo);
      })
      .catch(() => setWsMeta(null));
  }, []);

  useEffect(() => {
    fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setMetaConnected(!!j.connected);
      })
      .catch(() => setMetaConnected(false));
    loadWorkspaceMeta();
    // Só busca o status de conexão quando a integração está ligada (evita 404 desnecessário).
    if (googleAdsEnabled) {
      fetch("/api/settings/google")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.ok) setGoogleConnected(!!j.connected);
        })
        .catch(() => undefined);
    }
  }, [loadWorkspaceMeta, googleAdsEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "meta_reconnect" && metaOAuthError !== "PROFILE_MISMATCH") {
      setMetaConnected(true);
    }
    if (params.get("metaError") === "missing_app_config") {
      setMessage(t("metaErrorMissingApp"));
    }
    if (metaOAuthError === "PROFILE_MISMATCH") {
      setMessage(t("metaErrorProfileMismatch"));
    }
    if (params.get("googleConnected") === "1") {
      setGoogleConnected(true);
      setGoogleMessage(t("googleAdsConnectedMsg"));
    }
    if (params.get("googleError")) {
      setGoogleMessage(t("googleAdsErrorMsg"));
    }
  }, [locale, t, metaOAuthError]);

  function runWorkspaceMetaAction(body: Record<string, unknown>, successKey: string) {
    setWsMetaMessage(null);
    startWsMetaTransition(async () => {
      const res = await fetch("/api/settings/workspace-meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setWsMetaMessage(t("workspaceMetaActionFailed"));
        return;
      }
      setWsMeta(json as WorkspaceMetaInfo);
      setWsMetaMessage(t(successKey));
      if (body.action === "disconnect") setMetaConnected(false);
    });
  }

  return (
    <DsFlatSection
      title={t("integrationsPageTitle")}
      subtitle={t("integrationsPageSubtitle")}
      titleClassName="text-base"
      className="space-y-6"
      contentClassName="space-y-8"
    >
      {!metaOAuthConfigured ? <MetaSetupCallout /> : null}

      {message ? <div className="ui-alert-danger">{message}</div> : null}

      <article className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <Zap size={18} strokeWidth={2} />
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">Meta Ads</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                metaConnected
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-[var(--surface-thead)] text-[var(--text-dimmer)]"
              )}
            >
              {metaConnected === null
                ? tCommon("loading")
                : metaConnected
                  ? t("metaConnected")
                  : t("metaDisconnected")}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--text-dim)]">{t("metaAdsVsLoginHint")}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {connectMetaSlot}
          <Link href="/settings/meta-assets" className="ui-btn-secondary px-3 py-1.5 text-xs">
            {t("metaAssetsLink")}
          </Link>
          <Link href="/clients" className="ui-btn-secondary px-3 py-1.5 text-xs">
            {t("publishClientsLink")}
          </Link>
        </div>

        <div className="my-5 border-t border-[var(--border-color)]" />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <Database size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-main)]">{t("workspaceMetaTitle")}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dim)]">
                {t("workspaceMetaHint")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dimmer)]">
                {t("publishPerClient")}
              </p>
              {wsMeta?.canManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!wsMeta.isOwner ? (
                    <button
                      type="button"
                      disabled={wsMetaPending}
                      onClick={() => {
                        if (!metaConnected) {
                          setWsMetaMessage(t("workspaceMetaClaimNeedsToken"));
                          return;
                        }
                        runWorkspaceMetaAction({ action: "claim" }, "workspaceMetaClaimed");
                      }}
                      className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {t("workspaceMetaClaim")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={wsMetaPending}
                    onClick={() => {
                      if (!window.confirm(t("workspaceMetaDisconnectConfirm"))) return;
                      runWorkspaceMetaAction({ action: "disconnect" }, "workspaceMetaDisconnected");
                    }}
                    className="ui-btn-danger px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    {t("workspaceMetaDisconnect")}
                  </button>
                </div>
              ) : null}
              {wsMetaMessage ? (
                <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{wsMetaMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
              <User size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text-main)]">
                {wsMeta?.workspaceConnectionName
                  ? t("workspaceMetaResponsible", { name: wsMeta.workspaceConnectionName })
                  : t("workspaceMetaNone")}
              </p>
              {wsMeta?.workspaceConnectionName && !wsMeta.canManage ? (
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-dimmer)]">
                  {t("workspaceMetaManagedBy", { name: wsMeta.workspaceConnectionName })}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-6 md:grid-cols-2">
        <ComingSoonCard
          name={t("integrationWhatsappTitle")}
          description={t("integrationWhatsappDesc")}
          badgeTone="emerald"
          icon={
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
              <svg className="h-5 w-5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
            </span>
          }
        />
        {googleAdsEnabled ? (
          <article className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-thead)]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">
                    {t("integrationGoogleAdsTitle")}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      googleConnected
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-[var(--surface-thead)] text-[var(--text-dimmer)]"
                    )}
                  >
                    {googleConnected === null
                      ? tCommon("loading")
                      : googleConnected
                        ? t("metaConnected")
                        : t("metaDisconnected")}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-dim)]">
                  {t("googleAdsConnectHint")}
                </p>
                <div className="mt-3">
                  <a
                    href={`/api/google/oauth/start?redirectTo=${encodeURIComponent(
                      `/${locale}/settings?tab=integrations`
                    )}`}
                    className="ui-btn-accent inline-flex px-3 py-1.5 text-xs"
                  >
                    {googleConnected ? t("googleAdsReconnect") : t("googleAdsConnect")}
                  </a>
                </div>
                {googleMessage ? (
                  <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{googleMessage}</p>
                ) : null}
              </div>
            </div>
          </article>
        ) : (
          <ComingSoonCard
            name={t("integrationGoogleAdsTitle")}
            description={t("integrationGoogleAdsDesc")}
            badgeTone="sky"
            icon={
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-thead)]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z"
                  />
                </svg>
              </span>
            }
          />
        )}
      </div>
    </DsFlatSection>
  );
}
