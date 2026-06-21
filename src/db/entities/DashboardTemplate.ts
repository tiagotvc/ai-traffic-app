import { Column, Entity } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_templates" })
export class DashboardTemplate extends AppBaseEntity {
  @Column({ type: "uuid", nullable: true })
  tenantId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  category!: string;

  @Column({ type: "text", nullable: true })
  minPlanSlug?: string | null;

  @Column({ type: "jsonb", default: [] })
  widgets!: unknown[];

  @Column({ type: "boolean", default: false })
  isSystem!: boolean;
}
