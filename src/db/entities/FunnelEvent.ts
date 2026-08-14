import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/**
 * As etapas do funil, na ordem em que acontecem. As cinco primeiras são o funil de
 * aquisição (anúncio → landing page → cadastro → trial); as três últimas são o funil
 * de compra, que já existia.
 *
 * `eventType` é coluna `text`, não enum do banco: acrescentar etapa aqui não pede
 * migration.
 */
export type FunnelEventType =
  | "viewed_landing"
  | "clicked_cta"
  | "started_signup"
  | "completed_signup"
  | "started_trial"
  | "viewed_pricing"
  | "started_checkout"
  | "completed_checkout";

/**
 * Evento de funil do site público. Não existia nenhum registro nosso disso antes, só
 * GA4/Meta Pixel, que não são consultáveis num painel nosso e ficam vazios para quem
 * recusa cookies. Base do e-mail de alerta ("primeira vez que esse visitante chega no
 * checkout") e do painel admin de conversão.
 *
 * A origem da campanha (utm_*, fbclid, gclid) vai em `meta.attribution`, para dar pra
 * responder qual anúncio gerou cada etapa sem depender do relatório da Meta.
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
