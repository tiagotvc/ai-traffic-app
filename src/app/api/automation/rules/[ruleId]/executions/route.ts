import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

/**
 * Histórico de execuções de uma regra — os `Alert`s gravados pelo motor com
 * `automationRuleId` são o log canônico (mesma fonte do `executionCount` da lista).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { ruleId } = await params;
  const { tenant } = await getAppContext();
  const repos = await repositories();

  const rule = await repos.automationRule.findOne({
    where: { id: ruleId, tenantId: tenant.id }
  });
  if (!rule) {
    return NextResponse.json({ ok: false, error: "Regra não encontrada" }, { status: 404 });
  }

  const alerts = await repos.alert.find({
    where: { tenantId: tenant.id, automationRuleId: rule.id },
    order: { createdAt: "DESC" },
    take: 50
  });

  return NextResponse.json({
    ok: true,
    executions: alerts.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      title: a.title,
      description: a.description,
      severity: a.severity,
      metaCampaignId: a.metaCampaignId ?? null,
      metricKey: a.metricKey ?? null,
      actualValue: a.actualValue ?? null,
      thresholdValue: a.thresholdValue ?? null
    }))
  });
}
