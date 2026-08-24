"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Modo direto" (ver CommanderConfigView): id da capacidade que, quando presente no
 * conjunto de desligados, INVERTE o padrão calculado a partir do plano (XOR) — ver
 * commanderStructuralInsights em /api/campaign-creator/flags pro mesmo cálculo.
 */
export const DIRECT_MODE_CAPABILITY_ID = "commander.insights.structural";

export type ResolvedMap = Record<string, boolean | undefined>;

/** Estado compartilhado pelos 3 submenus do Commander (Visão geral/Cientistas/Configurações). */
export function useCommanderPreferences() {
  const [resolved, setResolved] = useState<ResolvedMap>({});
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [scientistsAllowed, setScientistsAllowed] = useState(true);
  const [isBasicPlan, setIsBasicPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/me/entitlements").then((r) => r.json()),
      fetch("/api/commander/preferences").then((r) => r.json())
    ])
      .then(
        ([entitlements, prefs]: [
          {
            platformFeatures?: ResolvedMap;
            entitlements?: { planSlug?: string; limits?: { allowCopilot?: boolean } };
          },
          { disabled?: string[] }
        ]) => {
          if (cancelled) return;
          if (entitlements.platformFeatures) setResolved(entitlements.platformFeatures);
          setScientistsAllowed(entitlements.entitlements?.limits?.allowCopilot !== false);
          setIsBasicPlan(entitlements.entitlements?.planSlug === "basic");
          setDisabled(new Set(prefs.disabled ?? []));
        }
      )
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (id: string, next: boolean) => {
    setSavingId(id);
    setDisabled((prev) => {
      const copy = new Set(prev);
      if (next) copy.delete(id);
      else copy.add(id);
      return copy;
    });
    try {
      const res = await fetch("/api/commander/preferences", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, enabled: next })
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; disabled?: string[] } | null;
      if (res.ok && json?.disabled) setDisabled(new Set(json.disabled));
    } finally {
      setSavingId(null);
    }
  }, []);

  const commanderPlatformOn = resolved["commander"] !== false;
  const commanderUserOn = !disabled.has("commander");
  const commanderOn = commanderPlatformOn && commanderUserOn;
  // Padrão: ligado (dicas ocultas) pra quem não é Individual; o toggle inverte esse
  // padrão em qualquer direção (mesma lógica de /api/campaign-creator/flags).
  const directModeOn = !isBasicPlan !== disabled.has(DIRECT_MODE_CAPABILITY_ID);

  const setDirectMode = useCallback(
    (wantDirectMode: boolean) => {
      const bitShouldBeInDisabledSet = !isBasicPlan !== wantDirectMode;
      void toggle(DIRECT_MODE_CAPABILITY_ID, !bitShouldBeInDisabledSet);
    },
    [isBasicPlan, toggle]
  );

  return {
    resolved,
    disabled,
    scientistsAllowed,
    isBasicPlan,
    loading,
    savingId,
    toggle,
    commanderPlatformOn,
    commanderUserOn,
    commanderOn,
    directModeOn,
    setDirectMode
  };
}
