import "server-only";

import { Between, In, Like } from "typeorm";

import { repositories } from "@/db/repositories";
import type { MetaCampaign } from "@/lib/meta-graph";
import { fetchCampaign, fetchCampaigns } from "@/lib/meta-graph";
import { num } from "@/lib/goal-types";
import { normalizeConditionGroups } from "@/lib/automation/rule-templates";
import { getEntitlements } from "@/lib/billing/entitlements";
// Efeitos externos (Meta/e-mail) passam pelo executor unificado do Engine; este arquivo
// mantém a avaliação das condições e a projeção de UI/state-tracking via Alerts.
import { enqueueApproval, executeAction } from "@/lib/engine/executor";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Hora atual (0–23) no horário de Brasília, independente do fuso do servidor. */
function currentHourInBrazil(): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false
  }).format(new Date());
  return Number(hour) % 24;
}

/** Dentro da janela `[startHour, endHour)`; suporta janelas que cruzam a meia-noite (ex.: 22h–6h). */
function isWithinSchedule(schedule: { startHour: number; endHour: number }, hour: number): boolean {
  const { startHour, endHour } = schedule;
  if (startHour === endHour) return true;
  return startHour < endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour;
}

const SCHEDULE_PAUSED = "schedule:paused";
const SCHEDULE_ACTIVATED = "schedule:activated";

type ExecutionMode = "alert" | "approval" | "auto";

/**
 * Modo de execução efetivo de uma regra: `alert`/`approval` só valem com
 * `PlanLimits.automationTier >= 2` — abaixo disso o motor força `auto` (comportamento
 * histórico), mesmo que a coluna `executionMode` diga outra coisa. É a rede de segurança
 * que garante que rebaixar o plano nunca "trava" uma regra numa fila que ninguém vê.
 */
function effectiveExecutionMode(mode: string | undefined, automationTier: number): ExecutionMode {
  const requested = mode === "alert" || mode === "approval" ? mode : "auto";
  return automationTier >= 2 ? requested : "auto";
}

async function tenantAutomationTier(tenantId: string): Promise<number> {
  const { limits } = await getEntitlements(tenantId);
  return limits.automationTier;
}

/**
 * Contas de anúncio no escopo de uma regra: as do cliente da regra, ou as de todos os
 * clientes DO TENANT. Sempre filtra por tenant — um `adRepo.find()` sem filtro vazaria
 * contas de outros tenants para dentro da avaliação da regra.
 */
async function accountsForRule(tenantId: string, ruleClientId: string | null | undefined) {
  const { adAccount: adRepo, client: clientRepo } = await repositories();
  if (ruleClientId) {
    const client = await clientRepo.findOne({ where: { id: ruleClientId, tenantId } });
    if (!client) return [];
    return adRepo.find({ where: { clientId: ruleClientId } });
  }
  const clients = await clientRepo.find({ where: { tenantId } });
  if (!clients.length) return [];
  return adRepo.find({ where: { clientId: In(clients.map((c) => c.id)) } });
}

/**
 * Motor das regras de gatilho por horário (`condition.schedule`). Independente do motor de
 * métricas: não depende de `campaignMetricSnapshot`, avalia o status ao vivo da campanha na Meta.
 * Chamado pelo cron `/api/cron/automation-schedule` (a cada hora, todos os tenants), já que
 * o motor de métricas só roda quando há uma sincronização (sob demanda, não periódica).
 */
export async function runScheduleAutomations(tenantId: string, metaAccessToken: string) {
  const {
    automationRule: ruleRepo,
    clientMetaSettings: settingsRepo,
    alert: alertRepo
  } = await repositories();

  const rules = await ruleRepo.find({ where: { tenantId, enabled: true } });
  const scheduleRules = rules.filter(
    (r) => (r.condition as { schedule?: { startHour?: number; endHour?: number } })?.schedule
  );
  if (!scheduleRules.length) return;

  const automationTier = await tenantAutomationTier(tenantId);
  const hour = currentHourInBrazil();
  const today = new Date().toISOString().slice(0, 10);

  for (const rule of scheduleRules) {
    const schedule = (rule.condition as { schedule: { startHour: number; endHour: number } }).schedule;
    const withinWindow = isWithinSchedule(schedule, hour);
    const mode = effectiveExecutionMode(rule.executionMode, automationTier);

    const accounts = await accountsForRule(tenantId, rule.clientId);
    if (!accounts.length) continue;

    if (rule.clientId) {
      const settings = await settingsRepo.findOne({ where: { clientId: rule.clientId } });
      if (!settings?.automationEnabled) continue;
    }

    for (const account of accounts) {
      let campaigns: MetaCampaign[];
      try {
        campaigns = await fetchCampaigns(metaAccessToken, account.metaAdAccountId);
      } catch {
        continue;
      }

      for (const campaign of campaigns) {
        const status = campaign.status;

        if (!withinWindow && status === "ACTIVE") {
          const description = `${campaign.name ?? campaign.id} — fora de ${schedule.startHour}h–${schedule.endHour}h`;
          try {
            if (mode === "auto") {
              const exec = await executeAction(
                {
                  tenantId,
                  clientId: account.clientId,
                  source: "rule",
                  automationRuleId: rule.id,
                  metaCampaignId: campaign.id,
                  campaignName: campaign.name ?? null,
                  actionType: "pause_campaign",
                  description
                },
                metaAccessToken
              );
              if (!exec.ok) continue;
            }
            await alertRepo.save(
              alertRepo.create({
                tenantId,
                clientId: account.clientId,
                type: "OTHER",
                severity: "warning",
                source: "automation",
                automationRuleId: rule.id,
                title:
                  mode === "auto"
                    ? `Automação: campanha pausada fora do horário (${rule.name})`
                    : `Automação: pausaria a campanha fora do horário (${rule.name})`,
                description,
                metaCampaignId: campaign.id,
                metricKey: mode === "auto" ? SCHEDULE_PAUSED : undefined,
                dismissed: false,
                dedupDay: today
              })
            );
            if (mode === "approval") {
              await enqueueApproval({
                tenantId,
                clientId: account.clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId: campaign.id,
                campaignName: campaign.name ?? null,
                actionType: "pause_campaign",
                description
              });
            }
          } catch {
            // skip
          }
          continue;
        }

        if (withinWindow && status === "PAUSED") {
          try {
            const lastMark = await alertRepo.findOne({
              where: { tenantId, automationRuleId: rule.id, metaCampaignId: campaign.id },
              order: { createdAt: "DESC" }
            });
            // Só reativa campanhas que a própria regra pausou — nunca uma pausa manual do usuário.
            if (lastMark?.metricKey !== SCHEDULE_PAUSED) continue;

            const description = `${campaign.name ?? campaign.id} — dentro de ${schedule.startHour}h–${schedule.endHour}h`;
            if (mode === "auto") {
              const exec = await executeAction(
                {
                  tenantId,
                  clientId: account.clientId,
                  source: "rule",
                  automationRuleId: rule.id,
                  metaCampaignId: campaign.id,
                  campaignName: campaign.name ?? null,
                  actionType: "reactivate_campaign",
                  description
                },
                metaAccessToken
              );
              if (!exec.ok) continue;
            }
            await alertRepo.save(
              alertRepo.create({
                tenantId,
                clientId: account.clientId,
                type: "OTHER",
                severity: "warning",
                source: "automation",
                automationRuleId: rule.id,
                title:
                  mode === "auto"
                    ? `Automação: campanha reativada (${rule.name})`
                    : `Automação: reativaria a campanha (${rule.name})`,
                description,
                metaCampaignId: campaign.id,
                metricKey: mode === "auto" ? SCHEDULE_ACTIVATED : undefined,
                dismissed: false,
                dedupDay: today
              })
            );
            if (mode === "approval") {
              await enqueueApproval({
                tenantId,
                clientId: account.clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId: campaign.id,
                campaignName: campaign.name ?? null,
                actionType: "reactivate_campaign",
                description
              });
            }
          } catch {
            // skip
          }
        }
      }
    }
  }
}

export async function runAutomationEngine(
  tenantId: string,
  metaAccessToken: string | undefined,
  campaignMeta: Map<string, MetaCampaign>
) {
  const {
    automationRule: ruleRepo,
    clientMetaSettings: settingsRepo,
    campaignMetricSnapshot: campRepo,
    alert: alertRepo,
    engineExecution: execRepo
  } = await repositories();

  const rules = await ruleRepo.find({ where: { tenantId, enabled: true } });
  if (!rules.length) return;

  const automationTier = await tenantAutomationTier(tenantId);
  const since = dateNDaysAgo(7);
  const today = new Date().toISOString().slice(0, 10);

  for (const rule of rules) {
    const cond = rule.condition as {
      groups?: Array<Array<{ metric?: string; op?: string; value?: number }>>;
      match?: string;
      conditions?: Array<{ metric?: string; op?: string; value?: number }>;
      metric?: string;
      op?: string;
      value?: number;
      minSpend?: number;
    };
    const action = rule.action as {
      type?: string;
      budgetPercent?: number;
      steps?: number;
      recipientEmail?: string;
    };

    // Normaliza para grupos de cláusulas (E dentro do grupo, OU entre grupos), aceitando a
    // forma nova (groups), a intermediária (match + conditions[]) e a legada (metric/op/value
    // no topo) para regras já salvas.
    const groups = normalizeConditionGroups(cond);
    if (!groups.length || !action.type) continue;

    const accounts = await accountsForRule(tenantId, rule.clientId);

    const accountIds = accounts.map((a) => a.id);
    if (!accountIds.length) continue;

    if (rule.clientId) {
      const settings = await settingsRepo.findOne({ where: { clientId: rule.clientId } });
      if (!settings?.automationEnabled) continue;
    }

    const rows = await campRepo.find({
      where: { adAccountId: In(accountIds), day: Between(since, today) }
    });

    const byCampaign = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byCampaign.get(r.metaCampaignId) ?? [];
      list.push(r);
      byCampaign.set(r.metaCampaignId, list);
    }

    for (const [metaCampaignId, snaps] of byCampaign) {
      let spend = 0;
      let conversions = 0;
      let cplSum = 0;
      let cplN = 0;
      let roasSum = 0;
      let roasN = 0;
      let impressions = 0;
      let clicks = 0;
      for (const s of snaps) {
        spend += num(s.spend);
        conversions += num(s.conversions);
        impressions += num(s.impressions);
        clicks += num(s.clicks);
        const leads = num(s.leads);
        if (leads > 0) {
          cplSum += num(s.spend) / leads;
          cplN += 1;
        }
        const roas = num(s.roas);
        if (roas > 0) {
          roasSum += roas;
          roasN += 1;
        }
      }
      const cpl = cplN ? cplSum / cplN : 0;
      const roas = roasN ? roasSum / roasN : 0;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      const metricValues: Record<string, number> = {
        cpl,
        cpa,
        ctr,
        spend,
        conversions,
        roas
      };

      if (cond.minSpend && spend < cond.minSpend) continue;

      const evalClause = (c: { metric?: string; op?: string; value?: number }) => {
        const metricVal = metricValues[c.metric ?? ""] ?? 0;
        const threshold = c.value ?? 0;
        return c.op === "gt"
          ? metricVal > threshold
          : c.op === "lt"
            ? metricVal < threshold
            : metricVal >= threshold;
      };

      const hit = groups.some((g) => g.every(evalClause));
      if (!hit) continue;

      // Descrição legível dos grupos (ex.: "(cpl=52.30 (limite 50) e roas=1.80 (limite 2)) ou spend=120.00 (limite 100)").
      const condDescription = groups
        .map((g) => {
          const text = g
            .map((c) => {
              const metricVal = metricValues[c.metric ?? ""] ?? 0;
              return `${c.metric}=${metricVal.toFixed(2)} (limite ${c.value ?? 0})`;
            })
            .join(" e ");
          return g.length > 1 && groups.length > 1 ? `(${text})` : text;
        })
        .join(" ou ");

      const meta = campaignMeta.get(metaCampaignId);
      const clientId = rule.clientId ?? accounts[0]?.clientId ?? null;
      const mode = effectiveExecutionMode(rule.executionMode, automationTier);

      if (action.type === "alert_only") {
        await alertRepo.save(
          alertRepo.create({
            tenantId,
            clientId,
            type: "OTHER",
            severity: "warning",
            source: "automation",
            automationRuleId: rule.id,
            title: `Automação: ${rule.name}`,
            description: `${meta?.name ?? metaCampaignId} — ${condDescription}`,
            metaCampaignId,
            dismissed: false,
            dedupDay: today
          })
        );
        continue;
      }

      if (action.type === "notify_email") {
        // Não-destrutiva como `alert_only` — sempre dispara, não respeita executionMode
        // (não há nada pra "aprovar" ou "auto-executar" além do próprio envio do alerta).
        const description = `${meta?.name ?? metaCampaignId} — ${condDescription}`;
        await alertRepo.save(
          alertRepo.create({
            tenantId,
            clientId,
            type: "OTHER",
            severity: "warning",
            source: "automation",
            automationRuleId: rule.id,
            title: `Automação: ${rule.name}`,
            description,
            metaCampaignId,
            dismissed: false,
            dedupDay: today
          })
        );
        if (action.recipientEmail) {
          // Best-effort — o Alert acima já registra o disparo; o executor grava o
          // resultado do envio (executed/failed) no log unificado.
          await executeAction({
            tenantId,
            clientId,
            source: "rule",
            automationRuleId: rule.id,
            metaCampaignId,
            campaignName: meta?.name ?? null,
            actionType: "notify_email",
            payload: { recipientEmail: action.recipientEmail, subject: `[Orion] ${rule.name}` },
            description: `${description}\n\nRegra: ${rule.name}`
          });
        }
        continue;
      }

      if (action.type === "pause_campaign" && metaAccessToken) {
        const description = `${meta?.name ?? metaCampaignId} — ${condDescription}`;
        try {
          if (mode === "auto") {
            const exec = await executeAction(
              {
                tenantId,
                clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId,
                campaignName: meta?.name ?? null,
                actionType: "pause_campaign",
                description
              },
              metaAccessToken
            );
            if (!exec.ok) continue;
          }
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "critical",
              source: "automation",
              automationRuleId: rule.id,
              title:
                mode === "auto"
                  ? `Automação: campanha pausada (${rule.name})`
                  : `Automação: pausaria a campanha (${rule.name})`,
              description,
              metaCampaignId,
              dismissed: false,
              dedupDay: today
            })
          );
          if (mode === "approval") {
            await enqueueApproval({
              tenantId,
              clientId,
              source: "rule",
              automationRuleId: rule.id,
              metaCampaignId,
              campaignName: meta?.name ?? null,
              actionType: "pause_campaign",
              description
            });
          }
        } catch {
          // skip
        }
        continue;
      }

      if (action.type === "adjust_budget_percent" && metaAccessToken) {
        const pct = action.budgetPercent ?? 10;
        try {
          const campaign = await fetchCampaign(metaAccessToken, metaCampaignId);
          const currentMinor = Number(campaign.daily_budget ?? 0);
          if (!currentMinor) continue;
          const next = Math.round(currentMinor * (1 + pct / 100));
          const description = `${meta?.name ?? metaCampaignId} — +${pct}% (R$ ${(currentMinor / 100).toFixed(2)} → R$ ${(next / 100).toFixed(2)}/dia)`;
          if (mode === "auto") {
            const exec = await executeAction(
              {
                tenantId,
                clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId,
                campaignName: meta?.name ?? null,
                actionType: "adjust_budget_percent",
                payload: { budgetPercent: pct },
                description
              },
              metaAccessToken
            );
            if (!exec.ok) continue;
          }
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "warning",
              source: "automation",
              automationRuleId: rule.id,
              title:
                mode === "auto"
                  ? `Automação: orçamento ajustado (${rule.name})`
                  : `Automação: ajustaria o orçamento (${rule.name})`,
              description,
              metaCampaignId,
              dismissed: false,
              dedupDay: today
            })
          );
          if (mode === "approval") {
            await enqueueApproval({
              tenantId,
              clientId,
              source: "rule",
              automationRuleId: rule.id,
              metaCampaignId,
              campaignName: meta?.name ?? null,
              actionType: "adjust_budget_percent",
              payload: { budgetPercent: pct },
              description
            });
          }
        } catch {
          // skip
        }
        continue;
      }

      if (action.type === "scale_gradual" && metaAccessToken) {
        const pct = action.budgetPercent ?? 10;
        const totalSteps = action.steps ?? 3;
        try {
          // Estado do progresso (quantos incrementos já rodaram) fica só no histórico de
          // Alerts desta regra+campanha — mesmo padrão de state tracking do gatilho de horário
          // (Alert.metricKey), sem precisar de tabela/migration nova.
          const lastStepAlert = await alertRepo.findOne({
            where: { tenantId, automationRuleId: rule.id, metaCampaignId, metricKey: Like("scale:step:%") },
            order: { createdAt: "DESC" }
          });
          const lastStep = lastStepAlert ? Number(lastStepAlert.metricKey?.split(":")[2]) || 0 : 0;
          if (lastStep >= totalSteps) continue; // escalada já completa

          // No máximo um incremento por dia, mesmo que a conta sincronize várias vezes hoje.
          if (lastStepAlert?.dedupDay === today) continue;

          if (mode === "approval") {
            // Evita empilhar pendências duplicadas do mesmo passo enquanto a última não é resolvida.
            const existingPending = await execRepo.findOne({
              where: { tenantId, automationRuleId: rule.id, metaCampaignId, status: "pending", actionType: "scale_gradual_step" }
            });
            if (existingPending) continue;
          }

          const nextStep = lastStep + 1;
          const campaign = await fetchCampaign(metaAccessToken, metaCampaignId);
          const currentMinor = Number(campaign.daily_budget ?? 0);
          if (!currentMinor) continue;
          const next = Math.round(currentMinor * (1 + pct / 100));
          const description = `${meta?.name ?? metaCampaignId} — passo ${nextStep}/${totalSteps}, +${pct}% (R$ ${(currentMinor / 100).toFixed(2)} → R$ ${(next / 100).toFixed(2)}/dia)`;
          if (mode === "auto") {
            const exec = await executeAction(
              {
                tenantId,
                clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId,
                campaignName: meta?.name ?? null,
                actionType: "scale_gradual_step",
                payload: { budgetPercent: pct, step: nextStep, totalSteps },
                description
              },
              metaAccessToken
            );
            if (!exec.ok) continue;
          }
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "warning",
              source: "automation",
              automationRuleId: rule.id,
              title:
                mode === "auto"
                  ? `Automação: orçamento escalado, passo ${nextStep}/${totalSteps} (${rule.name})`
                  : `Automação: escalaria orçamento, passo ${nextStep}/${totalSteps} (${rule.name})`,
              description,
              metaCampaignId,
              metricKey: mode === "auto" ? `scale:step:${nextStep}` : undefined,
              dismissed: false,
              dedupDay: today
            })
          );
          if (mode === "approval") {
            await enqueueApproval({
              tenantId,
              clientId,
              source: "rule",
              automationRuleId: rule.id,
              metaCampaignId,
              campaignName: meta?.name ?? null,
              actionType: "scale_gradual_step",
              payload: { budgetPercent: pct, step: nextStep, totalSteps },
              description
            });
          }
        } catch {
          // skip
        }
        continue;
      }

      if (action.type === "reactivate_campaign" && metaAccessToken) {
        // Só reativa campanhas que estão de fato pausadas agora — evita chamadas/alertas
        // redundantes quando a condição continua batendo numa campanha já ativa.
        if (meta?.status !== "PAUSED") continue;
        const description = `${meta?.name ?? metaCampaignId} — ${condDescription}`;
        try {
          if (mode === "auto") {
            const exec = await executeAction(
              {
                tenantId,
                clientId,
                source: "rule",
                automationRuleId: rule.id,
                metaCampaignId,
                campaignName: meta?.name ?? null,
                actionType: "reactivate_campaign",
                description
              },
              metaAccessToken
            );
            if (!exec.ok) continue;
          }
          await alertRepo.save(
            alertRepo.create({
              tenantId,
              clientId,
              type: "OTHER",
              severity: "warning",
              source: "automation",
              automationRuleId: rule.id,
              title:
                mode === "auto"
                  ? `Automação: campanha reativada (${rule.name})`
                  : `Automação: reativaria a campanha (${rule.name})`,
              description,
              metaCampaignId,
              dismissed: false,
              dedupDay: today
            })
          );
          if (mode === "approval") {
            await enqueueApproval({
              tenantId,
              clientId,
              source: "rule",
              automationRuleId: rule.id,
              metaCampaignId,
              campaignName: meta?.name ?? null,
              actionType: "reactivate_campaign",
              description
            });
          }
        } catch {
          // skip
        }
      }
    }
  }
}
