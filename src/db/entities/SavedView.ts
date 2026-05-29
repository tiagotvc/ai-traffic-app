import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "saved_views" })
export class SavedView extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "jsonb", default: () => `'{}'` })
  filters!: Record<string, unknown>;
}
