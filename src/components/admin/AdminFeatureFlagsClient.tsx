"use client";

import {
  AlertCircle,
  BarChart3,
  Brain,
  CheckCircle2,
  Coins,
  Flag,
  FlaskConical,
  LayoutGrid,
  Megaphone,
  Radio,
  Sparkles,
  Users,
  type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode
} from "react";

import { FeatureFlagUserPicker } from "@/components/admin/FeatureFlagUserPicker";
import {
  SettingsSectionNav,
  type SettingsNavItem
} from "@/components/settings/SettingsSectionNav";
import { DsPageHeader } from "@/design-system";
import type { AiCreditWeights, AiCreditsFeatureFlags } from "@/lib/ai-credits/types";
import {
  FEATURE_REGISTRY,
  getEffectiveRollout,
  getStoredEntry,
  isAncestorHardOff,
  isFeatureEnabledForUser
} from "@/lib/feature-flags/registry";
import type {
  FeatureFlagConfigMap,
  FeatureFlagEntry,
  FeatureNode,
  FeatureRolloutMode
} from "@/lib/feature-flags/types";

const FLAG_KEYS: (keyof AiCreditsFeatureFlags)[] = [
  "creditsV2Enabled",
  "tenantPolicyUiEnabled",
  "perClientCapsEnabled",
  "agentLayerEnabled"
];

const WEIGHT_KEYS: (keyof AiCreditWeights)[] = [
  "chat",
  "chat_with_proposals",
  "learnings",
  "actions",
  "hypotheses",
  "recommendations",
  "audience_suggestions",
  "campaign_generate",
  "creator_brain",
  "generic"
];

const ROLLOUT_MODES: FeatureRolloutMode[] = [
  "off",
  "admin_only",
  "global",
  "specific_users"
];

type PlatformModuleId = (typeof FEATURE_REGISTRY)[number]["id"];
type ModuleId = PlatformModuleId | "aiCredits";

const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  visions: LayoutGrid,
  campaigns: Megaphone,
  audiences: Users,
  brain: Brain,
  reports: BarChart3,
  scientists: FlaskConical,
  ai: Sparkles,
  meta: Radio,
  aiCredits: Coins
};

function moduleIcon(id: ModuleId): LucideIcon {
  return MODULE_ICONS[id] ?? Flag;
}

const VALID_MODULES: ModuleId[] = [
  ...FEATURE_REGISTRY.map((node) => node.id),
  "aiCredits"
];

function parseModule(raw: string | null): ModuleId {
  if (raw && VALID_MODULES.includes(raw as ModuleId)) return raw as ModuleId;
  return FEATURE_REGISTRY[0]?.id ?? "visions";
}

function rolloutLabelKey(mode: FeatureRolloutMode): string {
  return `featureFlagsRollout_${mode}`;
}

type StatusToast = {
  variant: "error" | "success";
  message: string;
  key: number;
};

function ModulesStatusToast({ toast }: { toast: StatusToast }) {
  const alertClass = toast.variant === "error" ? "ui-alert-danger" : "ui-alert-success";
  const Icon = toast.variant === "error" ? AlertCircle : CheckCircle2;

  return (
    <div className="campaign-creator-status-toast" role="alert" aria-live="assertive">
      <p
        className={`campaign-creator-status-toast__inner campaign-creator-status-toast__inner--solid ${alertClass}`}
      >
        <Icon size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left leading-snug">{toast.message}</span>
      </p>
    </div>
  );
}

export function AdminFeatureFlagsClient() {
  const t = useTranslations("billingAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModule = parseModule(searchParams.get("module"));
  const [activeModule, setActiveModule] = useState<ModuleId>(initialModule);
  const [featureFlags, setFeatureFlags] = useState<AiCreditsFeatureFlags | null>(null);
  const [weights, setWeights] = useState<AiCreditWeights | null>(null);
  const [platformFeatures, setPlatformFeatures] = useState<FeatureFlagConfigMap>({});
  const [toast, setToast] = useState<StatusToast | null>(null);
  const toastKey = useRef(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActiveModule(parseModule(searchParams.get("module")));
  }, [searchParams]);

  const selectModule = useCallback(
    (module: ModuleId) => {
      setActiveModule(module);
      const params = new URLSearchParams(searchParams.toString());
      params.set("module", module);
      router.replace(`/admin/platform/feature-flags?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const navItems = useMemo((): SettingsNavItem<ModuleId>[] => {
    const platformItems = FEATURE_REGISTRY.map((node) => ({
      value: node.id as ModuleId,
      label: node.label,
      description: node.description ?? "",
      icon: moduleIcon(node.id as ModuleId)
    }));

    return [
      ...platformItems,
      {
        value: "aiCredits",
        label: t("featureFlagsNavAiCredits"),
        description: t("featureFlagsNavAiCreditsDesc"),
        icon: moduleIcon("aiCredits")
      }
    ];
  }, [t]);

  const activeModuleNode = useMemo(
    () => FEATURE_REGISTRY.find((node) => node.id === activeModule) ?? null,
    [activeModule]
  );

  const pageMeta = useMemo(() => {
    if (activeModule === "aiCredits") {
      return {
        title: t("featureFlagsNavAiCredits"),
        subtitle: t("modulesSubtitle"),
        icon: moduleIcon("aiCredits")
      };
    }
    if (activeModuleNode) {
      return {
        title: activeModuleNode.label,
        subtitle: activeModuleNode.description ?? t("modulesHint"),
        icon: moduleIcon(activeModuleNode.id as ModuleId)
      };
    }
    return {
      title: t("modulesTitle"),
      subtitle: t("modulesSubtitle"),
      icon: Flag
    };
  }, [activeModule, activeModuleNode, t]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/platform/feature-flags");
      const json = await res.json();
      if (json.ok) {
        setFeatureFlags(json.featureFlags);
        setWeights(json.weights);
        setPlatformFeatures(json.platformFeatures ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pushToast = useCallback((variant: StatusToast["variant"], message: string) => {
    toastKey.current += 1;
    setToast({ variant, message, key: toastKey.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const delayMs = toast.variant === "error" ? 5000 : 3500;
    const timer = window.setTimeout(() => setToast(null), delayMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setRollout = (id: string, entry: FeatureFlagEntry | null) => {
    setPlatformFeatures((prev) => {
      const updated = { ...prev };
      if (!entry || entry.mode === "global") delete updated[id];
      else updated[id] = entry;
      return updated;
    });
  };

  const save = () => {
    if (!featureFlags || !weights) return;
    startTransition(async () => {
      setToast(null);
      const res = await fetch("/api/admin/platform/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureFlags, weights, platformFeatures })
      });
      const json = await res.json();
      if (json.ok) {
        setFeatureFlags(json.featureFlags);
        setWeights(json.weights);
        setPlatformFeatures(json.platformFeatures ?? {});
        pushToast("success", t("modulesSaved"));
        window.dispatchEvent(new Event("traffic:entitlements-changed"));
      } else {
        pushToast("error", json.error ?? t("saveError"));
      }
    });
  };

  const renderRolloutSelector = (
    id: string,
    opts?: { showInherit?: boolean; disabled?: boolean }
  ): ReactNode => {
    const stored = getStoredEntry(platformFeatures, id);
    const effective = getEffectiveRollout(platformFeatures, id);
    const activeMode = stored?.mode ?? (opts?.showInherit ? "inherit" : effective.mode);
    const disabled = opts?.disabled ?? false;

    return (
      <div className="shrink-0 space-y-2">
        <div
          className="flex flex-wrap justify-end gap-1"
          role="radiogroup"
          aria-label={t("featureFlagsRolloutLabel")}
        >
          {opts?.showInherit ? (
            <button
              type="button"
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                stored == null
                  ? "bg-[var(--ui-accent)] text-white"
                  : "border border-[var(--creator-card-border)] text-[var(--text-dim)]"
              }`}
              disabled={disabled}
              onClick={() => setRollout(id, null)}
            >
              {t("featureFlagsRollout_inherit")}
            </button>
          ) : null}
          {ROLLOUT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={activeMode === mode}
              className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                activeMode === mode
                  ? "bg-[var(--ui-accent)] text-white"
                  : "border border-[var(--creator-card-border)] text-[var(--text-dim)]"
              }`}
              disabled={disabled}
              onClick={() =>
                setRollout(id, {
                  mode,
                  allowedUserIds:
                    mode === "specific_users"
                      ? stored?.allowedUserIds ?? effective.allowedUserIds ?? []
                      : undefined
                })
              }
            >
              {t(rolloutLabelKey(mode))}
            </button>
          ))}
        </div>
        {stored?.mode === "specific_users" ? (
          <FeatureFlagUserPicker
            selectedIds={stored.allowedUserIds ?? []}
            disabled={disabled}
            onChange={(ids) => setRollout(id, { mode: "specific_users", allowedUserIds: ids })}
          />
        ) : null}
        {stored == null && effective.mode !== "global" ? (
          <p className="text-right text-[10px] text-[var(--text-dimmer)]">
            {t("featureFlagsRolloutEffective", { mode: t(rolloutLabelKey(effective.mode)) })}
          </p>
        ) : null}
      </div>
    );
  };

  const renderFeatureNode = (node: FeatureNode, depth: number): ReactNode => {
    const disabled = isAncestorHardOff(platformFeatures, node.id);
    const dependsUnmet = (node.dependsOn ?? []).some(
      (dep) =>
        !isFeatureEnabledForUser(platformFeatures, dep, { userId: "", isPlatformAdmin: true })
    );
    const controlsDisabled = disabled || dependsUnmet;

    return (
      <div key={node.id}>
        <div
          className="flex flex-col gap-3 border-b border-[var(--border-color)] py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between"
          style={{ paddingLeft: depth * 16 }}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`text-sm font-medium ${
                controlsDisabled ? "text-[var(--text-dimmer)]" : "text-[var(--text-main)]"
              }`}
            >
              {node.label}
            </p>
            {node.description ? (
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{node.description}</p>
            ) : null}
            {dependsUnmet ? (
              <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">
                {t("featureFlagsRequires", { deps: (node.dependsOn ?? []).join(", ") })}
              </p>
            ) : null}
          </div>
          {renderRolloutSelector(node.id, { showInherit: true, disabled: controlsDisabled })}
        </div>
        {node.children?.map((child) => renderFeatureNode(child, depth + 1))}
      </div>
    );
  };


  const renderModulePanel = () => {
    if (!activeModuleNode) return null;

    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-10 shrink-0 border-b border-[var(--border-color)] bg-[var(--creator-card-bg)] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {activeModuleNode.description ? (
                <p className="text-xs text-[var(--text-dim)]">{activeModuleNode.description}</p>
              ) : null}
              <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{t("modulesHint")}</p>
            </div>
            <div className="shrink-0 space-y-1">
              <span className="block text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
                {t("featureFlagsModuleMaster")}
              </span>
              {renderRolloutSelector(activeModuleNode.id)}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          {activeModuleNode.children?.length ? (
            <div className="divide-y divide-[var(--creator-card-border)] rounded-lg border border-[var(--creator-card-border)] px-3">
              {activeModuleNode.children.map((child) => renderFeatureNode(child, 0))}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-dim)]">{t("featureFlagsModuleEmpty")}</p>
          )}
        </div>
      </section>
    );
  };

  const renderAiCreditsPanel = () => (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 border-b border-[var(--border-color)] bg-[var(--creator-card-bg)] pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="ui-toolbar-icon-shell shrink-0 text-[var(--ui-accent)]">
            <Sparkles size={14} />
          </span>
          <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">
            {t("featureFlagsNavAiCredits")}
          </h2>
        </div>
        <p className="mt-2 text-xs text-[var(--text-dim)]">{t("featureFlagsMasterHint")}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pt-4">
        <div className="campaign-creator-card campaign-creator-card--compact">
          <h3 className="mb-4 font-heading text-sm font-semibold text-[var(--text-main)]">
            {t("featureFlagsSection")}
          </h3>
          <div className="space-y-3">
            {FLAG_KEYS.map((key) => (
              <label key={key} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 accent-[var(--ui-accent)]"
                  checked={featureFlags?.[key] ?? false}
                  disabled={key !== "creditsV2Enabled" && !featureFlags?.creditsV2Enabled}
                  onChange={(e) =>
                    setFeatureFlags((prev) =>
                      prev ? { ...prev, [key]: e.target.checked } : prev
                    )
                  }
                />
                <span>
                  <span className="font-medium">{t(`featureFlag_${key}`)}</span>
                  <span className="mt-0.5 block text-[var(--text-dim)]">
                    {t(`featureFlag_${key}_hint`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="campaign-creator-card campaign-creator-card--compact">
          <h2 className="campaign-creator-orion-section-label mb-1">{t("creditWeightsSection")}</h2>
          <p className="mb-4 text-xs text-[var(--text-dim)]">{t("creditWeightsHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WEIGHT_KEYS.map((key) => (
              <label key={key} className="block text-sm">
                <span className="campaign-creator-orion-section-label">
                  {t(`creditWeight_${key}`)}
                </span>
                <input
                  type="number"
                  min={0}
                  className="ui-input mt-1.5 w-full border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)]"
                  value={weights?.[key] ?? 1}
                  disabled={!featureFlags?.creditsV2Enabled}
                  onChange={(e) =>
                    setWeights((prev) =>
                      prev
                        ? { ...prev, [key]: Math.max(0, Number(e.target.value) || 0) }
                        : prev
                    )
                  }
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>;
  }

  const PageIcon = pageMeta.icon;

  return (
    <div className="flex max-h-[calc(100dvh-10rem)] min-h-0 flex-col overflow-hidden">
      {toast ? <ModulesStatusToast key={toast.key} toast={toast} /> : null}

      <div className="sticky top-0 z-20 shrink-0 border-b border-[var(--border-color)] bg-[var(--surface-bg)] pb-4 pt-1">
        <DsPageHeader
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          titleIcon={<PageIcon size={16} />}
          actions={
            <button type="button" className="ui-btn-accent shrink-0" disabled={isPending} onClick={save}>
              {isPending ? t("saving") : t("saveModule")}
            </button>
          }
          className="mb-0"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden pt-4 lg:flex-row lg:gap-8">
        <aside className="w-full shrink-0 lg:w-52 xl:w-56">
          <SettingsSectionNav
            items={navItems}
            active={activeModule}
            onChange={selectModule}
            ariaLabel={t("modulesNavAria")}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div key={activeModule} className="tab-transition animate-fade-up flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="campaign-creator-card campaign-creator-card--compact flex min-h-0 flex-1 flex-col overflow-hidden">
              {activeModule === "aiCredits" ? renderAiCreditsPanel() : renderModulePanel()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
