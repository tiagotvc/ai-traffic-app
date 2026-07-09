"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  AtSign,
  Building2,
  Database,
  ImageIcon,
  Info,
  KeyRound,
  Link2,
  Lock,
  Plug,
  Sparkles,
  User,
  Users
} from "lucide-react";
import {
  DsFlatDivider,
  DsFlatPanel,
  DsFlatSection,
  DsFormField,
  DsButton
} from "@/design-system";
import { FilterTextField } from "@/components/FilterTextField";
import { Link } from "@/i18n/navigation";
import { SettingsIntegrationsTab } from "@/components/settings/SettingsIntegrationsTab";
import { SettingsFooterSave } from "@/components/settings/SettingsFooterSave";
import {
  SettingsSectionNav,
  type SettingsNavItem
} from "@/components/settings/SettingsSectionNav";
import { WorkspaceTeamSection } from "@/components/WorkspaceTeamSection";
import type { Entitlements } from "@/lib/billing/types";

type SettingsTab = "account" | "team" | "integrations" | "webhooks" | "data";

export type { SettingsTab };

const VALID_TABS = new Set<SettingsTab>([
  "account",
  "team",
  "integrations",
  "webhooks",
  "data"
]);

export function parseSettingsTab(raw: string | null): SettingsTab {
  if (raw === "general" || raw === "branding") return "account";
  if (raw && VALID_TABS.has(raw as SettingsTab)) return raw as SettingsTab;
  return "account";
}

function parseTab(raw: string | null): SettingsTab {
  return parseSettingsTab(raw);
}

export function SettingsClient({
  locale,
  metaOAuthConfigured,
  metaOAuthError,
  connectMetaSlot,
  googleAdsEnabled = false,
  embedded = false,
  bare = false,
  activeTab: controlledTab,
  onActiveTabChange,
  allowWhiteLabel: allowWhiteLabelProp
}: {
  locale: string;
  metaOAuthConfigured: boolean;
  metaOAuthError?: string | null;
  connectMetaSlot: ReactNode;
  googleAdsEnabled?: boolean;
  embedded?: boolean;
  bare?: boolean;
  activeTab?: SettingsTab;
  onActiveTabChange?: (tab: SettingsTab) => void;
  /** When omitted, fetched from `/api/me/entitlements`. */
  allowWhiteLabel?: boolean;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [internalTab, setInternalTab] = useState<SettingsTab>(() => parseTab(searchParams.get("tab")));
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onActiveTabChange ?? setInternalTab;

  const [allowWhiteLabel, setAllowWhiteLabel] = useState(allowWhiteLabelProp ?? false);

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
    if (allowWhiteLabelProp !== undefined) {
      setAllowWhiteLabel(allowWhiteLabelProp);
      return;
    }
    fetch("/api/me/entitlements")
      .then((r) => r.json())
      .then((j) => {
        const entitlements = j.entitlements as Entitlements | undefined;
        setAllowWhiteLabel(Boolean(entitlements?.limits?.allowWhiteLabel));
      })
      .catch(() => setAllowWhiteLabel(false));
  }, [allowWhiteLabelProp]);

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
    if (VALID_TABS.has(tab) || searchParams.get("tab") === "general") {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  function selectTab(tab: SettingsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  }

  const loginMethodsLabel =
    account == null
      ? "—"
      : [
          account.hasPassword ? t("accountMethodPassword") : null,
          account.hasGoogle ? "Google" : null,
          account.hasFacebook ? "Facebook" : null
        ]
          .filter(Boolean)
          .join(" · ") || "—";

  const navItems = useMemo((): SettingsNavItem<SettingsTab>[] => {
    const icons: Record<SettingsTab, typeof User> = {
      account: User,
      team: Users,
      integrations: Plug,
      webhooks: Link2,
      data: Database
    };
    const descriptions: Record<SettingsTab, string> = {
      account: t("navAccountDesc"),
      team: t("navTeamDesc"),
      integrations: t("navIntegrationsDesc"),
      webhooks: t("webhooksSubtitle"),
      data: t("navDataDesc")
    };
    const labels: Record<SettingsTab, string> = {
      account: t("navAccountTitle"),
      team: t("navTeamTitle"),
      integrations: t("navIntegrationsTitle"),
      webhooks: t("tabWebhooks"),
      data: t("navDataTitle")
    };
    return (Object.keys(icons) as SettingsTab[]).map((key) => ({
      value: key,
      label: labels[key],
      description: descriptions[key],
      icon: icons[key]
    }));
  }, [t]);

  const panels = (
    <DsFlatPanel className={bare ? undefined : "ui-card p-4"}>
      {activeTab === "account" ? (
        <div className="space-y-8">
          <DsFlatSection title={t("accountTitle")} subtitle={t("accountSubtitle")}>
            {account ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FilterTextField
                    creatorField
                    icon={<AtSign size={13} />}
                    label={t("fieldEmail")}
                    value={account.email}
                    onChange={() => {}}
                    readOnly
                  />
                  <FilterTextField
                    creatorField
                    icon={<KeyRound size={13} />}
                    label={t("accountLoginMethods")}
                    value={loginMethodsLabel}
                    onChange={() => {}}
                    readOnly
                  />
                </div>

                {account.hasPassword ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-[var(--text-main)]">{t("passwordTitle")}</p>
                    <p className="text-[11px] text-[var(--text-dim)]">{t("passwordHint")}</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <DsFormField label={t("currentPassword")}>
                        <FilterTextField
                          creatorField
                          type="password"
                          icon={<Lock size={13} />}
                          label={t("currentPassword")}
                          value={currentPassword}
                          onChange={setCurrentPassword}
                          inputClassName="font-body"
                          aria-label={t("currentPassword")}
                        />
                      </DsFormField>
                      <DsFormField label={t("newPassword")}>
                        <FilterTextField
                          creatorField
                          type="password"
                          icon={<Lock size={13} />}
                          label={t("newPassword")}
                          value={newPassword}
                          onChange={setNewPassword}
                          aria-label={t("newPassword")}
                        />
                      </DsFormField>
                      <DsFormField label={t("confirmPassword")}>
                        <FilterTextField
                          creatorField
                          type="password"
                          icon={<Lock size={13} />}
                          label={t("confirmPassword")}
                          value={confirmPassword}
                          onChange={setConfirmPassword}
                          aria-label={t("confirmPassword")}
                        />
                      </DsFormField>
                    </div>
                    {passwordMessage ? (
                      <p className="text-xs text-[var(--text-dim)]">{passwordMessage}</p>
                    ) : null}
                    <DsButton
                      type="button"
                      variant="accent"
                      size="md"
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
                              json.error === "wrong_password" ? t("passwordWrong") : t("saveFailed")
                            );
                            return;
                          }
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setPasswordMessage(t("passwordChanged"));
                        });
                      }}
                    >
                      {passwordPending ? tCommon("loading") : t("passwordChangeBtn")}
                    </DsButton>
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
            <SettingsFooterSave
              onSave={() => {
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
              disabled={nicheSharePending}
              loading={nicheSharePending}
              loadingLabel={tCommon("loading")}
              saveLabel={tCommon("save")}
              message={nicheShareMessage}
            />
          </DsFlatSection>

          <DsFlatDivider />

          <DsFlatSection title={t("whitelabel")} subtitle={t("whitelabelHint")}>
            {allowWhiteLabel ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <DsFormField label={t("brandName")}>
                    <FilterTextField
                      creatorField
                      icon={<Building2 size={13} />}
                      label={t("brandName")}
                      value={brandName}
                      onChange={setBrandName}
                      placeholder={t("brandNamePlaceholder")}
                    />
                  </DsFormField>
                  <DsFormField label={t("logoUrl")}>
                    <FilterTextField
                      creatorField
                      icon={<ImageIcon size={13} />}
                      label={t("logoUrl")}
                      value={logoUrl}
                      onChange={setLogoUrl}
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </DsFormField>
                </div>
                <SettingsFooterSave
                  onSave={() => {
                    setMessage(null);
                    startTransition(async () => {
                      const res = await fetch("/api/settings/tenant", {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ brandName, logoUrl })
                      });
                      const json = await res.json().catch(() => null);
                      if (json?.error === "plan_white_label_required") {
                        setMessage(t("whitelabelUpgradeRequired"));
                        return;
                      }
                      setMessage(json?.ok ? t("saved") : json?.error ?? t("saveFailed"));
                    });
                  }}
                  disabled={isPending}
                  loading={isPending}
                  loadingLabel={tCommon("loading")}
                  saveLabel={tCommon("save")}
                  message={message}
                />
              </>
            ) : (
              <div className="rounded-xl border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-4">
                <p className="text-sm text-[var(--text-main)]">{t("whitelabelUpgradeTitle")}</p>
                <p className="mt-1 text-xs text-[var(--text-dim)]">{t("whitelabelUpgradeHint")}</p>
                <Link href="/billing/plans" className="ui-btn-accent mt-4 inline-flex px-4 py-2 text-sm">
                  {t("whitelabelUpgradeCta")}
                </Link>
              </div>
            )}
          </DsFlatSection>
        </div>
      ) : null}

      {activeTab === "team" ? <WorkspaceTeamSection workspaceName={brandName} /> : null}

      {activeTab === "integrations" ? (
        <SettingsIntegrationsTab
          locale={locale}
          metaOAuthConfigured={metaOAuthConfigured}
          metaOAuthError={metaOAuthError}
          connectMetaSlot={connectMetaSlot}
          googleAdsEnabled={googleAdsEnabled}
        />
      ) : null}

      {activeTab === "webhooks" ? (
        <div className="space-y-4">
          <DsFlatSection title={t("webhookAlertLabel")} subtitle={t("webhookAlertHint")}>
            <FilterTextField
              creatorField
              icon={<Link2 size={13} />}
              label="URL"
              value={webhookAlertUrl}
              onChange={setWebhookAlertUrl}
              placeholder="https://hooks.slack.com/..."
              inputClassName="font-mono text-xs"
            />
          </DsFlatSection>
          <DsFlatSection title={t("webhookReportLabel")} subtitle={t("webhookReportHint")}>
            <FilterTextField
              creatorField
              icon={<Link2 size={13} />}
              label="URL"
              value={webhookReportUrl}
              onChange={setWebhookReportUrl}
              placeholder="https://..."
              inputClassName="font-mono text-xs"
            />
          </DsFlatSection>
          <SettingsFooterSave
            onSave={() => {
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
            disabled={webhookPending}
            loading={webhookPending}
            loadingLabel={tCommon("loading")}
            saveLabel={tCommon("save")}
            message={webhookMessage}
          />
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

          <DsFlatSection title={t("resetDataTitle")} subtitle={t("resetDataHint")} tone="danger">
            <p className="text-[11px] text-[var(--text-dimmer)]">{t("resetDataKeeps")}</p>
            <DsFormField label={t("resetDataConfirmLabel")}>
              <FilterTextField
                creatorField
                icon={<Lock size={13} />}
                label={t("resetDataConfirmLabel")}
                value={resetText}
                onChange={setResetText}
                placeholder="RESET"
                inputClassName="font-mono text-sm"
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
      <div className="settings-layout flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="settings-layout__nav w-full shrink-0 lg:w-52 xl:w-56">
          <SettingsSectionNav
            items={navItems}
            active={activeTab}
            onChange={selectTab}
            ariaLabel={t("title")}
          />
        </aside>
        <div className="settings-layout__content min-w-0 flex-1">{panels}</div>
      </div>
    </div>
  );
}
