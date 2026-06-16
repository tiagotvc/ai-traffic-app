"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Link } from "@/i18n/navigation";
import { WorkspaceTeamSection } from "@/components/WorkspaceTeamSection";

type WorkspaceMetaInfo = {
  ok: true;
  workspaceConnectionUserId: string | null;
  workspaceConnectionName: string | null;
  isOwner: boolean;
  canManage: boolean;
};

export function SettingsClient({
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
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [purgePending, startPurgeTransition] = useTransition();
  const [wsMeta, setWsMeta] = useState<WorkspaceMetaInfo | null>(null);
  const [wsMetaMessage, setWsMetaMessage] = useState<string | null>(null);
  const [wsMetaPending, startWsMetaTransition] = useTransition();
  const [resetText, setResetText] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetPending, startResetTransition] = useTransition();
  const [nicheShareOptIn, setNicheShareOptIn] = useState(false);
  const [nicheShareMessage, setNicheShareMessage] = useState<string | null>(null);
  const [nicheSharePending, startNicheShareTransition] = useTransition();

  const loadWorkspaceMeta = useCallback(() => {
    fetch("/api/settings/workspace-meta")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setWsMeta(j as WorkspaceMetaInfo);
      })
      .catch(() => setWsMeta(null));
  }, []);

  useEffect(() => {
    fetch("/api/settings/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (j.tenant) {
          setBrandName(j.tenant.brandName ?? j.tenant.name ?? "");
          setLogoUrl(j.tenant.logoUrl ?? "");
          setNicheShareOptIn(!!j.tenant.agencyBrainNicheShareOptIn);
        }
      })
      .catch(() => setMessage(t("loadFailed")));

    fetch("/api/settings/meta")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setMetaConnected(!!j.connected);
      })
      .catch(() => setMetaConnected(false));

    loadWorkspaceMeta();
  }, [t, loadWorkspaceMeta]);

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

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <section className="lg:col-span-2 ui-card p-4">
        <div className="text-sm font-semibold">{t("whitelabel")}</div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">{t("brandName")}</div>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="mt-1 w-full rounded-xl ui-input"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("logoUrl")}</div>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="mt-1 w-full rounded-xl ui-input"
              placeholder="https://..."
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            disabled={isPending}
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const res = await fetch("/api/settings/tenant", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ brandName, logoUrl })
                });
                const json = await res.json().catch(() => null);
                setMessage(json?.ok ? t("saved") : json?.error ?? t("saveFailed"));
              });
            }}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {isPending ? tCommon("loading") : tCommon("save")}
          </button>
        </div>
        {message ? <div className="mt-2 text-xs text-slate-500">{message}</div> : null}
      </section>

      <section className="lg:col-span-2 ui-card p-4">
        <div className="text-sm font-semibold">{t("agencyBrainPrivacyTitle")}</div>
        <p className="mt-1 text-xs text-slate-500">{t("agencyBrainPrivacyHint")}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={nicheShareOptIn}
            onChange={(e) => setNicheShareOptIn(e.target.checked)}
            className="mt-0.5 rounded border-slate-300"
          />
          <span>{t("agencyBrainNicheShareOptIn")}</span>
        </label>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={nicheSharePending}
            onClick={() => {
              setNicheShareMessage(null);
              startNicheShareTransition(async () => {
                const res = await fetch("/api/settings/tenant", {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ agencyBrainNicheShareOptIn: nicheShareOptIn })
                });
                const json = await res.json().catch(() => null);
                setNicheShareMessage(
                  json?.ok ? t("agencyBrainPrivacySaved") : json?.error ?? t("saveFailed")
                );
              });
            }}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {nicheSharePending ? tCommon("loading") : tCommon("save")}
          </button>
        </div>
        {nicheShareMessage ? (
          <div className="mt-2 text-xs text-slate-500">{nicheShareMessage}</div>
        ) : null}
      </section>

      <div className="lg:col-span-2 lg:row-start-3">
        <WorkspaceTeamSection workspaceName={brandName} />
      </div>

      <aside className="space-y-3 lg:row-span-2 lg:row-start-1 lg:col-start-3">
        <section className="ui-card p-4">
          <div className="text-sm font-semibold">{t("metaTitle")}</div>
          <p className="mt-2 text-xs text-slate-500">{t("metaHint")}</p>
          {!metaOAuthConfigured ? (
            <p className="mt-2 text-xs text-amber-300/90">{t("metaSetupRequired")}</p>
          ) : null}
          {message ? <div className="mt-2 text-xs text-red-300">{message}</div> : null}
          <div className="mt-3 flex flex-col items-end gap-2">
            <span
              className={`rounded-lg px-2 py-1 text-[11px] font-medium ${
                metaConnected
                  ? "bg-emerald-950 text-emerald-300"
                  : metaConnected === false
                    ? "bg-slate-50 text-slate-500"
                    : "bg-slate-50 text-slate-500"
              }`}
            >
              {metaConnected === null
                ? tCommon("loading")
                : metaConnected
                  ? t("metaConnected")
                  : t("metaDisconnected")}
            </span>
            {connectMetaSlot}
            <Link
              href="/onboarding/connect"
              className="text-xs font-medium text-violet-400 underline hover:text-violet-300"
            >
              {t("connectPlatformLink")}
            </Link>
            <Link
              href="/settings/meta-assets"
              className="text-xs font-medium text-violet-400 underline hover:text-violet-300"
            >
              {t("metaAssetsLink")}
            </Link>
          </div>

          {wsMeta ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="text-xs font-semibold text-slate-700">
                {t("workspaceMetaTitle")}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t("workspaceMetaHint")}</p>
              <p className="mt-2 text-xs text-slate-600">
                {wsMeta.workspaceConnectionName
                  ? t("workspaceMetaResponsible", { name: wsMeta.workspaceConnectionName })
                  : t("workspaceMetaNone")}
              </p>

              {wsMeta.canManage ? (
                <div className="mt-3 flex flex-col gap-2">
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
                      className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                    >
                      {t("workspaceMetaClaim")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={wsMetaPending}
                    onClick={() => {
                      if (!window.confirm(t("workspaceMetaDisconnectConfirm"))) return;
                      runWorkspaceMetaAction(
                        { action: "disconnect" },
                        "workspaceMetaDisconnected"
                      );
                    }}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {t("workspaceMetaDisconnect")}
                  </button>
                </div>
              ) : wsMeta.workspaceConnectionName ? (
                <p className="mt-2 text-[11px] text-slate-400">
                  {t("workspaceMetaManagedBy", { name: wsMeta.workspaceConnectionName })}
                </p>
              ) : null}

              {wsMetaMessage ? (
                <p className="mt-2 text-[11px] text-slate-500">{wsMetaMessage}</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="ui-card p-4">
          <div className="text-sm font-semibold">{t("publishTitle")}</div>
          <p className="mt-2 text-xs text-slate-500">{t("publishHint")}</p>
          <p className="mt-2 text-xs text-slate-600">{t("publishPerClient")}</p>
          <p className="mt-2 text-xs text-slate-500">{t("publishEnvFallback")}</p>
          <Link
            href="/clients"
            className="mt-3 inline-block text-xs font-medium text-violet-400 underline hover:text-violet-300"
          >
            {t("publishClientsLink")}
          </Link>
        </section>

        <section className="ui-card p-4">
          <div className="text-sm font-semibold">{t("demoDataTitle")}</div>
          <p className="mt-2 text-xs text-slate-500">{t("demoDataHint")}</p>
          <p className="mt-1 text-[11px] text-slate-400">{t("demoDataNames")}</p>
          {purgeMessage ? <p className="mt-2 text-xs text-slate-600">{purgeMessage}</p> : null}
          <button
            type="button"
            disabled={purgePending}
            onClick={() => {
              if (!window.confirm(t("demoDataConfirm"))) return;
              setPurgeMessage(null);
              startPurgeTransition(async () => {
                const res = await fetch("/api/workspace/purge-demo", { method: "POST" });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.ok) {
                  setPurgeMessage(String(json.error ?? t("demoDataFailed")));
                  return;
                }
                setPurgeMessage(
                  t("demoDataDone", {
                    clients: json.removedClients ?? 0,
                    accounts: json.removedAdAccounts ?? 0
                  })
                );
                window.dispatchEvent(new Event("traffic:campaigns-reload"));
              });
            }}
            className="mt-3 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
          >
            {purgePending ? tCommon("loading") : t("demoDataAction")}
          </button>
        </section>

        <section className="ui-card border-rose-200 p-4">
          <div className="text-sm font-semibold text-rose-700">{t("resetDataTitle")}</div>
          <p className="mt-2 text-xs text-slate-500">{t("resetDataHint")}</p>
          <p className="mt-1 text-[11px] text-slate-400">{t("resetDataKeeps")}</p>
          <label className="mt-3 block text-[11px] font-medium text-slate-600">
            {t("resetDataConfirmLabel")}
          </label>
          <input
            value={resetText}
            onChange={(e) => setResetText(e.target.value)}
            placeholder="RESET"
            className="ui-input mt-1 !py-1.5 font-mono text-sm"
          />
          {resetMessage ? <p className="mt-2 text-xs text-slate-600">{resetMessage}</p> : null}
          <button
            type="button"
            disabled={resetPending || resetText !== "RESET"}
            onClick={() => {
              if (resetText !== "RESET") return;
              if (!window.confirm(t("resetDataConfirm"))) return;
              setResetMessage(null);
              startResetTransition(async () => {
                const res = await fetch("/api/settings/reset-workspace-data", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ confirm: "RESET" })
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.ok) {
                  setResetMessage(String(json.error ?? t("resetDataFailed")));
                  return;
                }
                setResetText("");
                setMetaConnected(false);
                setResetMessage(t("resetDataDone", { total: json.totalDeleted ?? 0 }));
                window.dispatchEvent(new Event("traffic:campaigns-reload"));
                loadWorkspaceMeta();
              });
            }}
            className="mt-3 w-full rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {resetPending ? tCommon("loading") : t("resetDataAction")}
          </button>
        </section>

        <section className="ui-card p-4">
          <div className="text-sm font-semibold">{t("integrations")}</div>
          <p className="mt-2 text-xs text-slate-500">{t("integrationsHint")}</p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-slate-500">
            <li>META_APP_ID</li>
            <li>META_APP_SECRET</li>
            <li>META_PAGE_ID {t("envOptional")}</li>
            <li>META_LINK_URL {t("envOptional")}</li>
            <li>GEMINI_API_KEY</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
