import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

/** Público salvo localmente com targeting compatível com a Meta (quando a API de saved_audiences não permite CREATE). */
@Entity({ name: "client_saved_targeting" })
@Index(["tenantId", "clientId", "metaAdAccountId"])
export class ClientSavedTargeting extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "jsonb" })
  targeting!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  metaSavedAudienceId!: string | null;
}
