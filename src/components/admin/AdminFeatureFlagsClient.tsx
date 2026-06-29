"use client";

import {
  BarChart3,
  Brain,
  Coins,
  Flag,
  FlaskConical,
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
  useState,
  useTransition,
  type ReactNode
} from "react";

import {
  SettingsSectionNav,
  type SettingsNavItem
} from "@/components/settings/SettingsSectionNav";
import { DsPageHeader, DsSwitch } from "@/design-system";
import type { AiCreditWeights, AiCreditsFeatureFlags } from "@/lib/ai-credits/types";
import {
  FEATURE_REGISTRY,
  featureAncestors,
  isFeatureEnabled
} from "@/lib/feature-flags/registry";
import type { FeatureFlagMap, FeatureNode } from "@/lib/feature-flags/types";

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

type PlatformModuleId = (typeof FEATURE_REGISTRY)[number]["id"];
type ModuleId = PlatformModuleId | "aiCredits";

const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
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
  return FEATURE_REGISTRY[0]?.id ?? "campaigns";
}

export function AdminFeatureFlagsClient() {
  const t = useTranslations("billingAdmin");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialModule = parseModule(searchParams.get("module"));
  const [activeModule, setActiveModule] = useState<ModuleId>(initialModule);
  const [featureFlags, setFeatureFlags] = useState<AiCreditsFeatureFlags | null>(null);
  const [weights, setWeights] = useState<AiCreditWeights | null>(null);
  const [platformFeatures, setPlatformFeatures] = useState<FeatureFlagMap>({});
  const [message, setMessage] = useState<string | null>(null);
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
        subtitle: t("featureFlagsSubtitle"),
        icon: moduleIcon("aiCredits")
      };
    }
    if (activeModuleNode) {
      return {
        title: activeModuleNode.label,
        subtitle: activeModuleNode.description ?? t("featureFlagsModulesHint"),
        icon: moduleIcon(activeModuleNode.id as ModuleId)
      };
    }
    return {
      title: t("featureFlagsTitle"),
      subtitle: t("featureFlagsSubtitle"),
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

  const toggleFeature = (id: string, next: boolean) => {
    setPlatformFeatures((prev) => {
      const updated = { ...prev };
      if (next) delete updated[id];
      else updated[id] = false;
      return updated;
    });
  };

  const save = () => {
    if (!featureFlags || !weights) return;
    startTransition(async () => {
      setMessage(null);
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
        setMessage(t("featureFlagsSaved"));
      } else {
        setMessage(json.error ?? t("saveError"));
      }
    });
  };

  const renderFeatureNode = (node: FeatureNode, depth: number): ReactNode => {
    const own = platformFeatures[node.id] !== false;
    const parentOff = featureAncestors(node.id).some(
      (a) => !isFeatureEnabled(platformFeatures, a)
    );
    const dependsUnmet = (node.dependsOn ?? []).some(
      (dep) => !isFeatureEnabled(platformFeatures, dep)
    );
    const disabled = parentOff || dependsUnmet;
    return (
      <div key={node.id}>
        <div
          className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] py-2.5 last:border-0"
          style={{ paddingLeft: depth * 20 }}
        >
          <div className="min-w-0">
            <p
              className={`text-sm font-medium ${
                disabled ? "text-[var(--text-dimmer)]" : "text-[var(--text-main)]"
              }`}
            >
              {node.label}
            </p>
            {node.description ? (
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{node.description}</p>
            ) : null}
            {dependsUnmet ? (
              <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">
                Requer: {(node.dependsOn ?? []).join(", ")}
              </p>
            ) : null}
          </div>
          <DsSwitch
            checked={own}
            disabled={disabled}
            ariaLabel={node.label}
            onChange={() => toggleFeature(node.id, !own)}
          />
        </div>
        {node.children?.map((child) => renderFeatureNode(child, depth + 1))}
      </div>
    );
  };

  const renderModulePanel = () => {
    if (!activeModuleNode) return null;

    const moduleEnabled = isFeatureEnabled(platformFeatures, activeModuleNode.id);

    return (
      <section className="campaign-creator-card campaign-creator-card--compact">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {activeModuleNode.label}
            </h2>
            {activeModuleNode.description ? (
              <p className="mt-0.5 text-xs text-[var(--text-dim)]">{activeModuleNode.description}</p>
            ) : null}
            <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">
              {t("featureFlagsModulesHint")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {t("featureFlagsModuleMaster")}
            </span>
            <DsSwitch
              checked={moduleEnabled}
              ariaLabel={activeModuleNode.label}
              onChange={() => toggleFeature(activeModuleNode.id, !moduleEnabled)}
            />
          </div>
        </div>

        {activeModuleNode.children?.length ? (
          <div className="divide-y divide-[var(--creator-card-border)] rounded-lg border border-[var(--creator-card-border)] px-3">
            {activeModuleNode.children.map((child) => renderFeatureNode(child, 0))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-dim)]">{t("featureFlagsModuleEmpty")}</p>
        )}
      </section>
    );
  };

  const renderAiCreditsPanel = () => (
    <div className="space-y-6">
      <section className="campaign-creator-card campaign-creator-card--compact">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="ui-toolbar-icon-shell shrink-0 text-[var(--ui-accent)]">
            <Sparkles size={14} />
          </span>
          <div>
            <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">
              {t("featureFlagsSection")}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-dim)]">{t("featureFlagsMasterHint")}</p>
          </div>
        </div>
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
      </section>

      <section className="campaign-creator-card campaign-creator-card--compact">
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
      </section>
    </div>
  );

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>;
  }

  const PageIcon = pageMeta.icon;

  return (
    <div className="space-y-6">
      <DsPageHeader
        title={pageMeta.title}
        subtitle={pageMeta.subtitle}
        titleIcon={<PageIcon size={16} />}
      />

      {message ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      <div className="settings-layout flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="settings-layout__nav w-full shrink-0 lg:w-52 xl:w-56">
          <SettingsSectionNav
            items={navItems}
            active={activeModule}
            onChange={selectModule}
            ariaLabel={t("featureFlagsNavAria")}
          />
        </aside>

        <div className="settings-layout__content min-w-0 flex-1">
          <div key={activeModule} className="tab-transition animate-fade-up space-y-6">
            {activeModule === "aiCredits" ? renderAiCreditsPanel() : renderModulePanel()}

            <div className="flex justify-end">
              <button type="button" className="ui-btn-accent" disabled={isPending} onClick={save}>
                {isPending ? t("saving") : t("savePlan")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
