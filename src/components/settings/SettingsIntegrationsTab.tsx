"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { MetaSetupCallout } from "@/components/MetaSetupCallout";

type WorkspaceMetaInfo = {
  ok: true;
  workspaceConnectionUserId: string | null;
  workspaceConnectionName: string | null;
  isOwner: boolean;
  canManage: boolean;
};

const INTEGRATION_ICONS = {
  meta: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-7v4h3l-4 7z" />
    </svg>
  ),
  whatsapp: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  ),
  google: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.8S8.9 5.8 12 5.8c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.5 3.4 14.5 2.6 12 2.6 6.9 2.6 2.7 6.8 2.7 12s4.2 9.4 9.3 9.4c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.5H12z" />
    </svg>
  )
};

function IntegrationCard({
  name,
  description,
  icon,
  status,
  statusTone = "neutral",
  actions,
  footer,
  disabled = false
}: {
  name: string;
  description: string;
  icon: ReactNode;
  status?: ReactNode;
  statusTone?: "connected" | "disconnected" | "neutral" | "soon";
  actions?: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
}) {
  const toneClass = {
    connected: "border-emerald-200 bg-emerald-50/40",
    disconnected: "border-slate-200 bg-white",
    neutral: "border-slate-200 bg-white",
    soon: "border-dashed border-slate-200 bg-slate-50/60 opacity-80"
  }[statusTone];

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
            {status}
          </div>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
          {!disabled && actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
          {footer ? <div className="mt-3 border-t border-slate-100 pt-3">{footer}</div> : null}
        </div>
      </div>
    </article>
  );
}

export function SettingsIntegrationsTab({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [wsMeta, setWsMeta] = useState<WorkspaceMetaInfo | null>(null);
  const [wsMetaMessage, setWsMetaMessage] = useState<string | null>(null);
  const [wsMetaPending, startWsMetaTransition] = useTransition();

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
  }, [loadWorkspaceMeta]);

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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{t("integrationsPageTitle")}</h2>
        <p className="text-[11px] text-slate-500">{t("integrationsPageSubtitle")}</p>
      </div>

      {!metaOAuthConfigured ? <MetaSetupCallout /> : null}
      {message ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {message}
        </div>
      ) : null}

      <IntegrationCard
        name="Meta Ads"
        description={t("metaHint")}
        icon={INTEGRATION_ICONS.meta}
        statusTone={metaConnected ? "connected" : "disconnected"}
        status={
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              metaConnected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {metaConnected === null
              ? tCommon("loading")
              : metaConnected
                ? t("metaConnected")
                : t("metaDisconnected")}
          </span>
        }
        actions={
          <>
            {connectMetaSlot}
            <Link
              href="/settings/meta-assets"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("metaAssetsLink")}
            </Link>
            <Link
              href="/clients"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("publishClientsLink")}
            </Link>
          </>
        }
        footer={
          <>
            <p className="text-[11px] text-slate-500">{t("publishPerClient")}</p>
            {wsMeta ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-slate-700">{t("workspaceMetaTitle")}</p>
                <p className="text-[11px] text-slate-500">{t("workspaceMetaHint")}</p>
                <p className="text-xs text-slate-600">
                  {wsMeta.workspaceConnectionName
                    ? t("workspaceMetaResponsible", { name: wsMeta.workspaceConnectionName })
                    : t("workspaceMetaNone")}
                </p>
                {wsMeta.canManage ? (
                  <div className="flex flex-wrap gap-2">
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
                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
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
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                    >
                      {t("workspaceMetaDisconnect")}
                    </button>
                  </div>
                ) : wsMeta.workspaceConnectionName ? (
                  <p className="text-[11px] text-slate-400">
                    {t("workspaceMetaManagedBy", { name: wsMeta.workspaceConnectionName })}
                  </p>
                ) : null}
                {wsMetaMessage ? (
                  <p className="text-[11px] text-slate-500">{wsMetaMessage}</p>
                ) : null}
              </div>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2">
        <IntegrationCard
          name={t("integrationWhatsappTitle")}
          description={t("integrationWhatsappDesc")}
          icon={INTEGRATION_ICONS.whatsapp}
          status={
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {t("integrationComingSoon")}
            </span>
          }
          statusTone="soon"
          disabled
        />
        <IntegrationCard
          name={t("integrationGoogleAdsTitle")}
          description={t("integrationGoogleAdsDesc")}
          icon={INTEGRATION_ICONS.google}
          status={
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {t("integrationComingSoon")}
            </span>
          }
          statusTone="soon"
          disabled
        />
      </div>
    </div>
  );
}
