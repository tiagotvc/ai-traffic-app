import "server-only";

import { repositories } from "@/db/repositories";
import { recordTimelineEvent } from "@/lib/agency-brain/timeline-service";

/** Registra evento de sync concluído por cliente com conta vinculada. */
export async function recordSyncCompletedTimelineEvents(
  tenantId: string,
  accountsSynced: number
): Promise<void> {
  if (accountsSynced <= 0) return;

  const { client: clientRepo, adAccount: adAccountRepo } = await repositories();
  const clients = await clientRepo.find({ where: { tenantId } });
  const now = new Date().toISOString();

  for (const client of clients) {
    const accountCount = await adAccountRepo.count({ where: { clientId: client.id } });
    if (!accountCount) continue;

    await recordTimelineEvent(tenantId, client.id, {
      type: "sync_completed",
      title: "Sincronização Meta concluída",
      description: `Dados atualizados para ${accountCount} conta(s) de anúncio.`,
      metadata: { accountsSynced: accountCount, syncedAt: now }
    });
  }
}
