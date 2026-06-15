import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";

@Entity({ name: "clients" })
export class Client extends AppBaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "jsonb", nullable: true })
  aiContext?: unknown | null;

  /** Página do Facebook usada ao criar anúncios deste cliente */
  @Column({ type: "text", nullable: true })
  metaPageId?: string | null;

  /** URL de destino dos anúncios deste cliente */
  @Column({ type: "text", nullable: true })
  metaLinkUrl?: string | null;

  /** Business Manager principal deste cliente (filtra contas/páginas no app) */
  @Column({ type: "text", nullable: true })
  metaBusinessId?: string | null;

  /** Google Ads customer ID (integração futura) */
  @Column({ type: "text", nullable: true })
  googleAdsCustomerId?: string | null;
}

