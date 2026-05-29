import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "meta_businesses" })
@Index(["tenantId", "metaBusinessId"], { unique: true })
export class MetaBusiness extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  metaBusinessId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastSyncedAt?: Date | null;
}
