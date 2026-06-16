import "server-only";

import { repositories } from "@/db/repositories";
import type { CustomMetric } from "@/db/entities/CustomMetric";
import type { CustomMetricDto } from "@/lib/custom-metric-types";
import {
  actionVarName,
  evaluateFormula,
  formulaAllowedVarNames,
  validateFormula
} from "@/lib/metric-formula";

function toDto(row: CustomMetric): CustomMetricDto {
  return {
    id: row.id,
    name: row.name,
    formula: row.formula,
    format: row.format,
    shared: row.userId == null,
    createdByUserId: row.createdByUserId
  };
}

export async function listCustomMetricsForUser(
  tenantId: string,
  userId: string
): Promise<CustomMetricDto[]> {
  const { customMetric: repo } = await repositories();
  const rows = await repo.find({ where: { tenantId }, order: { createdAt: "ASC" } });
  return rows
    .filter((r) => r.userId == null || r.userId === userId)
    .map(toDto);
}

export async function createCustomMetric(input: {
  tenantId: string;
  userId: string;
  name: string;
  formula: string;
  format: string;
  shared: boolean;
  extraVars?: string[];
}): Promise<CustomMetricDto> {
  const allowed = formulaAllowedVarNames();
  for (const v of input.extraVars ?? []) allowed.add(v);
  const err = validateFormula(input.formula, allowed);
  if (err) throw new Error(err);

  const { customMetric: repo } = await repositories();
  const row = await repo.save(
    repo.create({
      tenantId: input.tenantId,
      userId: input.shared ? null : input.userId,
      name: input.name.trim(),
      formula: input.formula.trim(),
      format: input.format,
      createdByUserId: input.userId
    })
  );
  return toDto(row);
}

export async function deleteCustomMetric(
  tenantId: string,
  userId: string,
  id: string,
  isAdmin: boolean
): Promise<boolean> {
  const { customMetric: repo } = await repositories();
  const row = await repo.findOne({ where: { id, tenantId } });
  if (!row) return false;
  if (!isAdmin && row.createdByUserId !== userId) return false;
  await repo.remove(row);
  return true;
}

export { evaluateFormula, actionVarName };
