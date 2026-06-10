import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "meta_ad_account_inventory" })
@Index(["tenantId", "metaAdAccountId"], { unique: true })
export class MetaAdAccountInventory extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text", nullable: true })
  metaBusinessId?: string | null;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text", nullable: true })
  label?: string | null;

  /** IANA tz da conta na Meta (ex.: America/Sao_Paulo). Define o "hoje" dos relatórios. */
  @Column({ type: "text", nullable: true })
  timezone?: string | null;

  @Column({ type: "bool", default: false })
  isDemo!: boolean;
}
