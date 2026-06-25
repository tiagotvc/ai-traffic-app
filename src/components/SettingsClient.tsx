"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Info, Sparkles } from "lucide-react";
import {
  DsFlatDivider,
  DsFlatPanel,
  DsFlatSection,
  DsFormActions,
  DsFormField
} from "@/design-system";
import { SettingsIntegrationsTab } from "@/components/settings/SettingsIntegrationsTab";
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
  bare = false,
  activeTab: controlledTab,
  onActiveTabChange
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
  embedded?: boolean;
  bare?: boolean;
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
    <DsFlatPanel className={bare ? undefined : "ui-card p-4"}>
        {activeTab === "general" ? (
          <div className="space-y-8">
            <DsFlatSection title={t("accountTitle")} subtitle={t("accountSubtitle")}>
              {account ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-[var(--surface-bg)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                        E-mail
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-[var(--text-main)]">{account.email}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--surface-bg)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                        {t("accountLoginMethods")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-dim)]">
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
                    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-bg)] p-3">
                      <p className="text-xs font-semibold text-[var(--text-main)]">{t("passwordTitle")}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{t("passwordHint")}</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <DsFormField label={t("currentPassword")}>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="current-password"
                          />
                        </DsFormField>
                        <DsFormField label={t("newPassword")}>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="new-password"
                          />
                        </DsFormField>
                        <DsFormField label={t("confirmPassword")}>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="ui-input w-full text-sm"
                            autoComplete="new-password"
                          />
                        </DsFormField>
                      </div>
                      <DsFormActions message={passwordMessage}>
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
                          className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
                        >
                          {passwordPending ? tCommon("loading") : t("passwordChangeBtn")}
                        </button>
                      </DsFormActions>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-dim)]">{t("passwordOAuthOnly")}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-dim)]">{tCommon("loading")}</p>
              )}
            </DsFlatSection>

            <DsFlatDivider />

            <DsFlatSection title={t("whitelabel")} subtitle={t("whitelabelHint")}>
              <div className="grid gap-3 md:grid-cols-2">
                <DsFormField label={t("brandName")}>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="ui-input w-full"
                    placeholder={t("brandNamePlaceholder")}
                  />
                </DsFormField>
                <DsFormField label={t("logoUrl")}>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="ui-input w-full"
                    placeholder="https://exemplo.com/logo.png"
                  />
                </DsFormField>
              </div>
              <div className="mt-3">
                <DsFormActions message={message}>
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
                    className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    {isPending ? tCommon("loading") : tCommon("save")}
                  </button>
                </DsFormActions>
              </div>
            </DsFlatSection>

            <DsFlatDivider />

            <DsFlatSection
              title={t("agencyBrainPrivacyTitle")}
              subtitle={t("agencyBrainPrivacyHint")}
              titleAdornment={<Sparkles size={14} className="text-[var(--ui-accent)]" />}
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-main)]">
                <input
                  type="checkbox"
                  checked={nicheShareOptIn}
                  onChange={(e) => setNicheShareOptIn(e.target.checked)}
                  className="rounded border-[var(--border-color)]"
                />
                <span className="text-xs">{t("agencyBrainNicheShareOptIn")}</span>
                <Info size={13} className="text-[var(--text-dimmer)]" />
              </label>
              <div className="mt-3">
                <DsFormActions message={nicheShareMessage}>
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
                    className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
                  >
                    {nicheSharePending ? tCommon("loading") : tCommon("save")}
                  </button>
                </DsFormActions>
              </div>
            </DsFlatSection>
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
              <h2 className="text-sm font-semibold text-[var(--text-main)]">{t("webhooksTitle")}</h2>
              <p className="text-[11px] text-[var(--text-dim)]">{t("webhooksSubtitle")}</p>
            </div>
            <DsFlatSection title={t("webhookAlertLabel")} subtitle={t("webhookAlertHint")}>
              <DsFormField label="URL">
                <input
                  value={webhookAlertUrl}
                  onChange={(e) => setWebhookAlertUrl(e.target.value)}
                  className="ui-input w-full font-mono text-xs"
                  placeholder="https://hooks.slack.com/..."
                />
              </DsFormField>
            </DsFlatSection>
            <DsFlatSection title={t("webhookReportLabel")} subtitle={t("webhookReportHint")}>
              <DsFormField label="URL">
                <input
                  value={webhookReportUrl}
                  onChange={(e) => setWebhookReportUrl(e.target.value)}
                  className="ui-input w-full font-mono text-xs"
                  placeholder="https://..."
                />
              </DsFormField>
            </DsFlatSection>
            <DsFormActions message={webhookMessage}>
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
                className="ui-btn-accent px-3 py-1.5 text-xs disabled:opacity-60"
              >
                {webhookPending ? tCommon("loading") : tCommon("save")}
              </button>
            </DsFormActions>
          </div>
        ) : null}

        {activeTab === "data" ? (
          <div className="space-y-8">
            <DsFlatSection title={t("demoDataTitle")} subtitle={t("demoDataHint")}>
              <p className="text-[11px] text-[var(--text-dimmer)]">{t("demoDataNames")}</p>
              {purgeMessage ? <p className="mt-2 text-xs text-[var(--text-dim)]">{purgeMessage}</p> : null}
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
                className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 disabled:opacity-60"
              >
                {purgePending ? tCommon("loading") : t("demoDataAction")}
              </button>
            </DsFlatSection>

            <DsFlatDivider />

            <DsFlatSection
              title={t("resetDataTitle")}
              subtitle={t("resetDataHint")}
              tone="danger"
            >
              <p className="text-[11px] text-[var(--text-dimmer)]">{t("resetDataKeeps")}</p>
              <DsFormField label={t("resetDataConfirmLabel")}>
                <input
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder="RESET"
                  className="ui-input !py-1.5 font-mono text-sm"
                />
              </DsFormField>
              {resetMessage ? <p className="mt-2 text-xs text-[var(--text-dim)]">{resetMessage}</p> : null}
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
            </DsFlatSection>
          </div>
        ) : null}
    </DsFlatPanel>
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
