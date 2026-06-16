import type { ClientGoal } from "@/db/entities/ClientGoal";

export type ClientAdaptiveThresholds = {
  spendWaste: number;
  cpaWeakPct: number; // e.g. -20 significa CPA 20% abaixo
  cpaStrongPct: number; // e.g. -30 significa CPA 30% abaixo
  ctrWeakPct: number; // e.g. +15
  ctrStrongPct: number; // e.g. +30
  roasLiftWeakPct: number; // e.g. +10
  roasLiftStrongPct: number; // e.g. +20
  frequencySaturation: number; // limite de frequência
};

export function getClientAdaptiveThresholds(
  clientId: string,
  goal: ClientGoal | null,
  weeklySpend: number
): ClientAdaptiveThresholds {
  const goalThreshold =
    goal?.maxSpendWithoutConversion != null ? Number(goal.maxSpendWithoutConversion) : 500;

  // evita thresholds "fixos" para contas muito pequenas/grandes.
  const effective = Math.max(goalThreshold, weeklySpend * 0.05);

  // quanto maior o gasto, mais cedo classificamos (mais dados).
  const density = effective > 0 ? weeklySpend / effective : 1;

  // sintoniza levemente os deltas com base no volume.
  if (density < 0.7) {
    return {
      spendWaste: effective,
      cpaWeakPct: -15,
      cpaStrongPct: -25,
      ctrWeakPct: 10,
      ctrStrongPct: 25,
      roasLiftWeakPct: 8,
      roasLiftStrongPct: 15,
      frequencySaturation: 3.5
    };
  }

  if (density > 1.8) {
    return {
      spendWaste: effective,
      cpaWeakPct: -20,
      cpaStrongPct: -35,
      ctrWeakPct: 20,
      ctrStrongPct: 35,
      roasLiftWeakPct: 12,
      roasLiftStrongPct: 22,
      frequencySaturation: 3.3
    };
  }

  return {
    spendWaste: effective,
    cpaWeakPct: -20,
    cpaStrongPct: -30,
    ctrWeakPct: 15,
    ctrStrongPct: 30,
    roasLiftWeakPct: 10,
    roasLiftStrongPct: 20,
    frequencySaturation: 3.5
  };
}

