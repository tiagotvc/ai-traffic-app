import "server-only";

import { repositories } from "@/db/repositories";
import type { FunnelEventType } from "@/db/entities/FunnelEvent";
import { notifyAdminNewCheckoutVisitor } from "@/lib/billing/funnel-alerts";

/**
 * Grava um evento de funil (visitou planos / iniciou checkout / completou checkout).
 * Best-effort — telemetria nunca pode derrubar o fluxo real de compra. Na primeira vez
 * que um visitante inicia checkout, dispara o alerta pro admin (Camada 3 do plano).
 */
export async function recordFunnelEvent(input: {
  visitorId: string;
  userId?: string | null;
  tenantId?: string | null;
  eventType: FunnelEventType;
  planSlug?: string | null;
  email?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const { funnelEvent: repo } = await repositories();

    let isFirstCheckoutStart = false;
    if (input.eventType === "started_checkout") {
      const priorCount = await repo.count({
        where: { visitorId: input.visitorId, eventType: "started_checkout" }
      });
      isFirstCheckoutStart = priorCount === 0;
    }

    await repo.save(
      repo.create({
        visitorId: input.visitorId,
        userId: input.userId ?? null,
        tenantId: input.tenantId ?? null,
        eventType: input.eventType,
        planSlug: input.planSlug ?? null,
        email: input.email ?? null,
        meta: input.meta ?? null
      })
    );

    if (isFirstCheckoutStart) {
      await notifyAdminNewCheckoutVisitor({
        visitorId: input.visitorId,
        planSlug: input.planSlug ?? null,
        email: input.email ?? null
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[funnel] falha ao gravar evento", err);
  }
}
