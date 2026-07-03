import "server-only";

import { repositories } from "@/db/repositories";
import type { DomainEventModule } from "@/db/entities/DomainEvent";

/**
 * Outbox do ecossistema (docs/orion-architecture §3.2): os módulos publicam artefatos
 * aqui em vez de se chamarem sincronamente. Best-effort por contrato — emitir um evento
 * NUNCA pode derrubar a operação que o gerou (a fonte de verdade é a operação, o evento
 * é o rastro). Consumidores: projeções de UI, Inngest e o export analítico (BigQuery).
 */
export async function emitDomainEvent(input: {
  tenantId: string;
  clientId?: string | null;
  module: DomainEventModule;
  type: string;
  payload?: Record<string, unknown> | null;
  sourceType?: string | null;
  sourceId?: string | null;
}): Promise<void> {
  try {
    const { domainEvent: repo } = await repositories();
    await repo.save(
      repo.create({
        tenantId: input.tenantId,
        clientId: input.clientId ?? null,
        module: input.module,
        type: input.type,
        payload: input.payload ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null
      })
    );
  } catch (err) {
    console.error("[domain-events] emit failed", input.module, input.type, err);
  }
}
