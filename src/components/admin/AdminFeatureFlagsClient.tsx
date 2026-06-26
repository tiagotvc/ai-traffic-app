"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { Flag, LayoutGrid, Sparkles } from "lucide-react";

import { DsFlatSection, DsPageHeader, DsSwitch } from "@/design-system";
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
  "generic"
];

export function AdminFeatureFlagsClient() {
  const t = useTranslations("billingAdmin");
  const [featureFlags, setFeatureFlags] = useState<AiCreditsFeatureFlags | null>(null);
  const [weights, setWeights] = useState<AiCreditWeights | null>(null);
  const [platformFeatures, setPlatformFeatures] = useState<FeatureFlagMap>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

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

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <DsPageHeader
        title={t("featureFlagsTitle")}
        subtitle={t("featureFlagsSubtitle")}
        titleIcon={<Flag size={16} />}
      />

      {message ? (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          {message}
        </p>
      ) : null}

      <DsFlatSection title="Módulos & Funcionalidades" titleIcon={<LayoutGrid size={14} />}>
        <p className="mb-4 text-sm text-[var(--text-dim)]">
          Ative/desative funcionalidades para toda a plataforma. Desligar um módulo desliga tudo
          dentro dele. Vale para todos os usuários (independe do plano).
        </p>
        <div className="rounded-xl border border-[var(--border-color)] p-1 px-3">
          {FEATURE_REGISTRY.map((node) => renderFeatureNode(node, 0))}
        </div>
      </DsFlatSection>

      <DsFlatSection title={t("featureFlagsSection")} titleIcon={<Sparkles size={14} />}>
        <p className="mb-4 text-sm text-[var(--text-dim)]">{t("featureFlagsMasterHint")}</p>
        <div className="space-y-3">
          {FLAG_KEYS.map((key) => (
            <label key={key} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
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
      </DsFlatSection>

      <DsFlatSection title={t("creditWeightsSection")}>
        <p className="mb-4 text-sm text-[var(--text-dim)]">{t("creditWeightsHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEIGHT_KEYS.map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-[var(--text-dim)]">{t(`creditWeight_${key}`)}</span>
              <input
                type="number"
                min={0}
                className="ui-input mt-1 w-full"
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
      </DsFlatSection>

      <button
        type="button"
        className="ui-btn-accent"
        disabled={isPending}
        onClick={save}
      >
        {isPending ? t("saving") : t("savePlan")}
      </button>
    </div>
  );
}
