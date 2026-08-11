import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type FunnelEventType = "viewed_pricing" | "started_checkout" | "completed_checkout";

/**
 * Evento de funil do site público (planos → checkout) — não existia nenhum registro
 * nosso disso antes, só GA4/Meta Pixel (que não são consultáveis num painel nosso).
 * Base do e-mail de alerta ("primeira vez que esse visitante chega no checkout") e do
 * painel admin de conversão.
 */
@Entity({ name: "funnel_events" })
@Index(["eventType", "createdAt"])
@Index(["visitorId", "eventType"])
export class FunnelEvent extends AppBaseEntity {
  @Column({ type: "text" })
  visitorId!: string;

  @Column({ type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ type: "uuid", nullable: true })
  tenantId?: string | null;

  @Column({ type: "text" })
  eventType!: FunnelEventType;

  @Column({ type: "text", nullable: true })
  planSlug?: string | null;

  @Column({ type: "text", nullable: true })
  email?: string | null;

  @Column({ type: "jsonb", nullable: true })
  meta?: Record<string, unknown> | null;
}
