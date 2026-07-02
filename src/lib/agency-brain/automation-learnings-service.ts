import "server-only";

import { In, MoreThanOrEqual } from "typeorm";

import { repositories } from "@/db/repositories";
import { buildDedupeKey } from "@/lib/agency-brain/learning-rules";
import type { SuggestedLearningDraft } from "@/lib/agency-brain/types";
import type { LearningCategory } from "@/db/entities/ClientLearning";

/**
 * Aresta Engine→Brain do ecossistema: o log de execução do Engine (`Alert`s com
 * `source="automation"`) é lido pelo Brain e vira aprendizado sugerido quando revela um
 * padrão — uma regra que dispara repetidamente na mesma campanha não é um evento, é um
 * sintoma crônico (orçamento, criativo ou a própria regra precisam de revisão).
 *
 * Comunicação por artefato (contrato do ecossistema): o Engine só escreve o log; o Brain
 * consome no seu próprio pipeline. Nenhuma chamada síncrona entre módulos.
 */

const MIN_TRIGGERS_FOR_PATTERN = 2;
const MAX_DRAFTS = 5;

function categoryForAction(actionType?: string): LearningCategory {
  if (actionType === "adjust_budget_percent" || actionType === "scale_gradual") return "BUDGET";
  return "GENERAL";
}

/** O motor grava `description = "<campanha> — <condição>"`; extrai o nome da campanha. */
function campaignNameFromDescription(description: string, fallback: string): string {
  const name = description.split(" — ")[0]?.trim();
  return name || fallback;
}

export async function automationExecutionsToLearningDrafts(
  tenantId: string,
  clientId: string,
  windowDays: number
): Promise<SuggestedLearningDraft[]> {
  const { alert: alertRepo, automationRule: ruleRepo } = await repositories();

  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const alerts = await alertRepo.find({
    where: {
      tenantId,
      clientId,
      source: "automation",
      createdAt: MoreThanOrEqual(since)
    },
    order: { createdAt: "DESC" },
    take: 200
  });

  const byRuleAndCampaign = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    if (!alert.automationRuleId || !alert.metaCampaignId) continue;
    const key = `${alert.automationRuleId}:${alert.metaCampaignId}`;
    const bucket = byRuleAndCampaign.get(key);
    if (bucket) bucket.push(alert);
    else byRuleAndCampaign.set(key, [alert]);
  }

  const recurring = [...byRuleAndCampaign.entries()]
    .filter(([, group]) => group.length >= MIN_TRIGGERS_FOR_PATTERN)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, MAX_DRAFTS);
  if (!recurring.length) return [];

  const ruleIds = [...new Set(recurring.map(([key]) => key.split(":")[0]))];
  const rules = await ruleRepo.find({ where: { tenantId, id: In(ruleIds) } });
  const ruleById = new Map(rules.map((r) => [r.id, r]));

  const drafts: SuggestedLearningDraft[] = [];
  for (const [key, group] of recurring) {
    const [ruleId, metaCampaignId] = key.split(":");
    const rule = ruleById.get(ruleId);
    if (!rule) continue;

    const latest = group[0];
    const campaignName = campaignNameFromDescription(latest.description, metaCampaignId);
    const count = group.length;

    drafts.push({
      title: `Automação recorrente: "${rule.name}" em ${campaignName}`,
      description:
        `A regra disparou ${count} vez(es) nos últimos ${windowDays} dias na mesma campanha. ` +
        `Condição cronicamente verdadeira — vale revisar orçamento, criativo ou a própria regra ` +
        `em vez de deixar a automação apagando o mesmo incêndio.`,
      category: categoryForAction((rule.action as { type?: string } | null)?.type),
      impact: count >= 4 ? "HIGH" : "MEDIUM",
      confidence: "MEDIUM",
      metaCampaignId,
      evidence: {
        ruleId: rule.id,
        reason: "automation_recurring_trigger",
        actualValue: count,
        metaCampaignId,
        campaignName
      },
      dedupeKey: buildDedupeKey(`automation_recurring:${rule.id}`, clientId, metaCampaignId, windowDays),
      tags: ["automation", "engine", "recurring"]
    });
  }

  return drafts;
}
