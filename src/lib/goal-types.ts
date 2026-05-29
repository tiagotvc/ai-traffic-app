export type GoalFields = {
  maxCpl?: number | null;
  maxCpa?: number | null;
  maxCpc?: number | null;
  minCtr?: number | null;
  minRoas?: number | null;
  maxSpendWithoutConversion?: number | null;
  budgetAlertPercent?: number | null;
  windowDays?: number | null;
  enabled?: boolean;
};

export type ResolvedGoals = GoalFields & {
  objective?: "leads" | "sales" | "traffic";
};

export function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function mergeGoals(
  client: GoalFields & { objective?: "leads" | "sales" | "traffic" },
  campaign?: GoalFields | null
): ResolvedGoals {
  const pick = <K extends keyof GoalFields>(key: K): number | null | undefined => {
    const c = campaign?.[key];
    if (c !== null && c !== undefined) return c as number;
    return client[key] as number | null | undefined;
  };

  return {
    objective: client.objective,
    maxCpl: pick("maxCpl") ?? null,
    maxCpa: pick("maxCpa") ?? null,
    maxCpc: pick("maxCpc") ?? null,
    minCtr: pick("minCtr") ?? null,
    minRoas: pick("minRoas") ?? null,
    maxSpendWithoutConversion: pick("maxSpendWithoutConversion") ?? null,
    budgetAlertPercent: pick("budgetAlertPercent") ?? null,
    windowDays: campaign?.windowDays ?? client.windowDays ?? 1,
    enabled: campaign?.enabled ?? client.enabled ?? true
  };
}

export function goalFieldsToEntity(
  body: GoalFields
): Partial<{
  maxCpl: string | null;
  maxCpa: string | null;
  maxCpc: string | null;
  minCtr: string | null;
  minRoas: string | null;
  maxSpendWithoutConversion: string | null;
  budgetAlertPercent: string | null;
  windowDays: number | null | undefined;
  enabled: boolean;
}> {
  const toStr = (n: number | null | undefined) =>
    n === null || n === undefined ? null : String(n);

  return {
    maxCpl: toStr(body.maxCpl),
    maxCpa: toStr(body.maxCpa),
    maxCpc: toStr(body.maxCpc),
    minCtr: toStr(body.minCtr),
    minRoas: toStr(body.minRoas),
    maxSpendWithoutConversion: toStr(body.maxSpendWithoutConversion),
    budgetAlertPercent: toStr(body.budgetAlertPercent),
    windowDays: body.windowDays,
    enabled: body.enabled
  };
}

export function entityToGoalFields(row: {
  maxCpl?: string | null;
  maxCpa?: string | null;
  maxCpc?: string | null;
  minCtr?: string | null;
  minRoas?: string | null;
  maxSpendWithoutConversion?: string | null;
  budgetAlertPercent?: string | null;
  windowDays?: number | null;
  enabled?: boolean;
  objective?: string;
}): GoalFields & { objective?: "leads" | "sales" | "traffic" } {
  const n = (v?: string | null) => (v === null || v === undefined ? null : Number(v));
  return {
    objective: row.objective as "leads" | "sales" | "traffic" | undefined,
    maxCpl: n(row.maxCpl),
    maxCpa: n(row.maxCpa),
    maxCpc: n(row.maxCpc),
    minCtr: n(row.minCtr),
    minRoas: n(row.minRoas),
    maxSpendWithoutConversion: n(row.maxSpendWithoutConversion),
    budgetAlertPercent: n(row.budgetAlertPercent),
    windowDays: row.windowDays ?? 1,
    enabled: row.enabled ?? true
  };
}
