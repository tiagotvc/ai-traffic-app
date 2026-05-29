import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "meta_pages" })
@Index(["tenantId", "metaPageId"], { unique: true })
export class MetaPage extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text", nullable: true })
  metaBusinessId?: string | null;

  @Column({ type: "text" })
  metaPageId!: string;

  @Column({ type: "text" })
  name!: string;
}
