"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { SettingsIntegrationsTab } from "@/components/settings/SettingsIntegrationsTab";
import { SettingsField, SettingsSaveRow, SettingsSection } from "@/components/settings/SettingsUi";
import { PageTabs } from "@/components/layout/PageTabs";
import { WorkspaceTeamSection } from "@/components/WorkspaceTeamSection";

type SettingsTab = "general" | "team" | "integrations" | "webhooks" | "data";

export type { SettingsTab };

const VALID_TABS = new Set<SettingsTab>(["general", "team", "integrations", "webhooks", "data"]);

export function parseSettingsTab(raw: string | null): SettingsTab {
  if (raw && VALID_TABS.has(raw as SettingsTab)) return raw as SettingsTab;
  return "general";
}

function parseTab(raw: string | null): SettingsTab {
  return parseSettingsTab(raw);
}

export function SettingsClient({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot,
  embedded = false,
  activeTab: controlledTab,
  onActiveTabChange
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
  embedded?: boolean;
  activeTab?: SettingsTab;
  onActiveTabChange?: (tab: SettingsTab) => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [internalTab, setInternalTab] = useState<SettingsTab>(() => parseTab(searchParams.get("tab")));
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onActiveTabChange ?? setInternalTab;

  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [nicheShareOptIn, setNicheShareOptIn] = useState(false);
  const [nicheShareMessage, setNicheShareMessage] = useState<string | null>(null);
  const [nicheSharePending, startNicheShareTransition] = useTransition();

  const [account, setAccount] = useState<{
    email: string;
    name: string | null;
    hasPassword: boolean;
    hasGoogle: boolean;
    hasFacebook: boolean;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();

  const [webhookAlertUrl, setWebhookAlertUrl] = useState("");
  const [webhookReportUrl, setWebhookReportUrl] = useState("");
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);
  const [webhookPending, startWebhookTransition] = useTransition();

  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [purgePending, startPurgeTransition] = useTransition();
  const [resetText, setResetText] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetPending, startResetTransition] = useTransition();

  const loadTenant = useCallback(() => {
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
  }, [t]);

  useEffect(() => {
    loadTenant();
    fetch("/api/settings/account")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAccount(j.account);
      })
      .catch(() => setAccount(null));
    fetch("/api/settings/webhooks")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setWebhookAlertUrl(j.webhooks.webhookAlertUrl ?? "");
          setWebhookReportUrl(j.webhooks.webhookReportUrl ?? "");
        }
      })
      .catch(() => {});
  }, [loadTenant]);

  useEffect(() => {
    const tab = parseTab(searchParams.get("tab"));
    if (VALID_TABS.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  const tabs: Array<{ key: SettingsTab; label: string }> = [
    { key: "general", label: t("tabGeneral") },
    { key: "team", label: t("tabTeam") },
    { key: "integrations", label: t("tabIntegrations") },
    { key: "webhooks", label: t("tabWebhooks") },
    { key: "data", label: t("tabData") }
  ];

  const panels = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {activeTab === "general" ? (
          <div className="space-y-4">
            <SettingsSection title={t("accountTitle")} subtitle={t("accountSubtitle")}>
              {account ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        E-mail
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-slate-800">{account.email}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {t("accountLoginMethods")}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {[
                          account.hasPassword ? t("accountMethodPassword") : null,
                          account.hasGoogle ? "Google" : null,
                          account.hasFacebook ? "Facebook" : null
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>

                  {account.hasPassword ? (
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-xs font-semibold text-slate-800">{t("passwordTitle")}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{t("passwordHint")}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <SettingsField label={t("currentPassword")}>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="current-password"
                          />
                        </SettingsField>
                        <SettingsField label={t("newPassword")}>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="new-password"
                          />
                        </SettingsField>
                        <SettingsField label={t("confirmPassword")}>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="new-password"
                          />
                        </SettingsField>
                      </div>
                      <SettingsSaveRow message={passwordMessage}>
                        <button
                          type="button"
                          disabled={
                            passwordPending ||
                            !currentPassword ||
                            newPassword.length < 6 ||
                            newPassword !== confirmPassword
                          }
                          onClick={() => {
                            setPasswordMessage(null);
                            startPasswordTransition(async () => {
                              const res = await fetch("/api/settings/password", {
                                method: "PATCH",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ currentPassword, newPassword })
                              });
                              const json = await res.json().catch(() => ({}));
                              if (!res.ok || !json.ok) {
                                setPasswordMessage(
                                  json.error === "wrong_password"
                                    ? t("passwordWrong")
                                    : t("saveFailed")
                                );
                                return;
                              }
                              setCurrentPassword("");
                              setNewPassword("");
                              setConfirmPassword("");
                              setPasswordMessage(t("passwordChanged"));
                            });
                          }}
                          className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                        >
                          {passwordPending ? tCommon("loading") : t("passwordChangeBtn")}
                        </button>
                      </SettingsSaveRow>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{t("passwordOAuthOnly")}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">{tCommon("loading")}</p>
              )}
            </SettingsSection>

            <SettingsSection title={t("whitelabel")} subtitle={t("whitelabelHint")}>
              <div className="grid gap-3 md:grid-cols-2">
                <SettingsField label={t("brandName")}>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="ui-input w-full"
                  />
                </SettingsField>
                <SettingsField label={t("logoUrl")}>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="ui-input w-full"
                    placeholder="https://..."
                  />
                </SettingsField>
              </div>
              <div className="mt-3">
                <SettingsSaveRow message={message}>
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
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    {isPending ? tCommon("loading") : tCommon("save")}
                  </button>
                </SettingsSaveRow>
              </div>
            </SettingsSection>

            <SettingsSection
              title={t("agencyBrainPrivacyTitle")}
              subtitle={t("agencyBrainPrivacyHint")}
            >
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={nicheShareOptIn}
                  onChange={(e) => setNicheShareOptIn(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <span className="text-xs">{t("agencyBrainNicheShareOptIn")}</span>
              </label>
              <div className="mt-3">
                <SettingsSaveRow message={nicheShareMessage}>
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
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
                  >
                    {nicheSharePending ? tCommon("loading") : tCommon("save")}
                  </button>
                </SettingsSaveRow>
              </div>
            </SettingsSection>
          </div>
        ) : null}

        {activeTab === "team" ? (
          <WorkspaceTeamSection workspaceName={brandName} />
        ) : null}

        {activeTab === "integrations" ? (
          <SettingsIntegrationsTab
            locale={locale}
            metaOAuthConfigured={metaOAuthConfigured}
            metaOAuthError={metaOAuthError}
            connectMetaSlot={connectMetaSlot}
          />
        ) : null}

        {activeTab === "webhooks" ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t("webhooksTitle")}</h2>
              <p className="text-[11px] text-slate-500">{t("webhooksSubtitle")}</p>
            </div>
            <SettingsSection title={t("webhookAlertLabel")} subtitle={t("webhookAlertHint")}>
              <SettingsField label="URL">
                <input
                  value={webhookAlertUrl}
                  onChange={(e) => setWebhookAlertUrl(e.target.value)}
                  className="ui-input w-full font-mono text-xs"
                  placeholder="https://hooks.slack.com/..."
                />
              </SettingsField>
            </SettingsSection>
            <SettingsSection title={t("webhookReportLabel")} subtitle={t("webhookReportHint")}>
              <SettingsField label="URL">
                <input
                  value={webhookReportUrl}
                  onChange={(e) => setWebhookReportUrl(e.target.value)}
                  className="ui-input w-full font-mono text-xs"
                  placeholder="https://..."
                />
              </SettingsField>
            </SettingsSection>
            <SettingsSaveRow message={webhookMessage}>
              <button
                type="button"
                disabled={webhookPending}
                onClick={() => {
                  setWebhookMessage(null);
                  startWebhookTransition(async () => {
                    const res = await fetch("/api/settings/webhooks", {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ webhookAlertUrl, webhookReportUrl })
                    });
                    const json = await res.json().catch(() => ({}));
                    setWebhookMessage(json?.ok ? t("webhookSaved") : json?.error ?? t("saveFailed"));
                  });
                }}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
              >
                {webhookPending ? tCommon("loading") : tCommon("save")}
              </button>
            </SettingsSaveRow>
          </div>
        ) : null}

        {activeTab === "data" ? (
          <div className="space-y-4">
            <SettingsSection title={t("demoDataTitle")} subtitle={t("demoDataHint")}>
              <p className="text-[11px] text-slate-400">{t("demoDataNames")}</p>
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
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
              >
                {purgePending ? tCommon("loading") : t("demoDataAction")}
              </button>
            </SettingsSection>

            <SettingsSection
              title={t("resetDataTitle")}
              subtitle={t("resetDataHint")}
              accent="danger"
            >
              <p className="text-[11px] text-slate-400">{t("resetDataKeeps")}</p>
              <SettingsField label={t("resetDataConfirmLabel")}>
                <input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder="RESET"
                  className="ui-input !py-1.5 font-mono text-sm"
                />
              </SettingsField>
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
                    setResetMessage(t("resetDataDone", { total: json.totalDeleted ?? 0 }));
                    window.dispatchEvent(new Event("traffic:campaigns-reload"));
                  });
                }}
                className="mt-3 w-full rounded-lg border border-rose-300 bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 sm:w-auto"
              >
                {resetPending ? tCommon("loading") : t("resetDataAction")}
              </button>
            </SettingsSection>
          </div>
        ) : null}
    </div>
  );

  if (embedded) {
    return panels;
  }

  return (
    <div className="space-y-4">
      <PageTabs tabs={tabs} active={activeTab} onChange={selectTab} />
      {panels}
    </div>
  );
}
