import "server-only";

import { In } from "typeorm";

import { repositories } from "@/db/repositories";

export type ResetCounts = Record<string, number>;

/**
 * Apaga TODOS os dados de clientes e da conexão Meta de um tenant, mantendo as
 * estruturas do app: Tenant, User, TenantMember, TenantInvite e preferências de
 * usuário (NotificationState, SavedView) e o histórico de auditoria (AuditLog).
 *
 * Ordem filho→pai para respeitar as FKs. Escopado SEMPRE ao tenantId.
 */
export async function resetWorkspaceData(tenantId: string): Promise<ResetCounts> {
  const r = await repositories();
  const counts: ResetCounts = {};

  const bump = (key: string, affected?: number | null) => {
    counts[key] = (counts[key] ?? 0) + (affected ?? 0);
  };

  // Coleta os escopos a partir do tenant.
  const clients = await r.client.find({ where: { tenantId }, select: { id: true } });
  const clientIds = clients.map((c) => c.id);

  const accounts = clientIds.length
    ? await r.adAccount.find({
        where: { clientId: In(clientIds) },
        select: { id: true, metaAdAccountId: true }
      })
    : [];
  const accountIds = accounts.map((a) => a.id);
  const metaAdAccountIds = [...new Set(accounts.map((a) => a.metaAdAccountId).filter(Boolean))];

  const members = await r.tenantMember.find({ where: { tenantId }, select: { userId: true } });
  const users = await r.user.find({ where: { tenantId }, select: { id: true } });
  const userIds = [...new Set([...members.map((m) => m.userId), ...users.map((u) => u.id)])];

  // Filhos de AdAccount (snapshots).
  if (accountIds.length) {
    bump("metricSnapshot", (await r.metricSnapshot.delete({ adAccountId: In(accountIds) })).affected);
    bump(
      "campaignMetricSnapshot",
      (await r.campaignMetricSnapshot.delete({ adAccountId: In(accountIds) })).affected
    );
  }

  // Filhos de Client.
  if (clientIds.length) {
    bump("campaignGoal", (await r.campaignGoal.delete({ clientId: In(clientIds) })).affected);
    bump("clientGoal", (await r.clientGoal.delete({ clientId: In(clientIds) })).affected);
    bump(
      "clientMetaSettings",
      (await r.clientMetaSettings.delete({ clientId: In(clientIds) })).affected
    );
    bump("clientTag", (await r.clientTag.delete({ clientId: In(clientIds) })).affected);
    bump("creativeAsset", (await r.creativeAsset.delete({ clientId: In(clientIds) })).affected);
    bump("lookalikeJob", (await r.lookalikeJob.delete({ clientId: In(clientIds) })).affected);
    bump("userClient", (await r.userClient.delete({ clientId: In(clientIds) })).affected);
    bump("adAccount", (await r.adAccount.delete({ clientId: In(clientIds) })).affected);
  }

  // Cliente e tabelas escopadas por tenant.
  bump("client", (await r.client.delete({ tenantId })).affected);
  bump("aiRecommendation", (await r.aiRecommendation.delete({ tenantId })).affected);
  bump("alert", (await r.alert.delete({ tenantId })).affected);
  bump("automationRule", (await r.automationRule.delete({ tenantId })).affected);
  bump("campaignPreset", (await r.campaignPreset.delete({ tenantId })).affected);
  bump("campaignTemplate", (await r.campaignTemplate.delete({ tenantId })).affected);
  bump("reportSchedule", (await r.reportSchedule.delete({ tenantId })).affected);
  bump("rankingConfig", (await r.rankingConfig.delete({ tenantId })).affected);
  bump("syncQueueJob", (await r.syncQueueJob.delete({ tenantId })).affected);
  bump("syncRun", (await r.syncRun.delete({ tenantId })).affected);
  bump("tenantSyncState", (await r.tenantSyncState.delete({ tenantId })).affected);

  // Inventário e descobertas da Meta (escopadas por tenant).
  bump("metaAdAccountInventory", (await r.metaAdAccountInventory.delete({ tenantId })).affected);
  bump("metaBusiness", (await r.metaBusiness.delete({ tenantId })).affected);
  bump("metaPage", (await r.metaPage.delete({ tenantId })).affected);

  // Cache de públicos (sem tenantId; escopado pelas contas que existiam).
  if (metaAdAccountIds.length) {
    bump(
      "metaAudienceCache",
      (await r.metaAudienceCache.delete({ metaAdAccountId: In(metaAdAccountIds) })).affected
    );
  }

  // Tokens Meta dos usuários do tenant + zera o dono da conexão.
  if (userIds.length) {
    bump("metaAuth", (await r.metaAuth.delete({ userId: In(userIds) })).affected);
  }
  const tenantRow = await r.tenant.findOne({ where: { id: tenantId } });
  if (tenantRow && tenantRow.metaConnectionUserId) {
    tenantRow.metaConnectionUserId = null;
    await r.tenant.save(tenantRow);
  }

  return counts;
}
