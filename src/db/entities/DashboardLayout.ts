import { Column, Entity, Index, Unique } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_layouts" })
@Unique(["tenantId", "userId", "slug"])
@Index(["tenantId", "userId", "sortOrder"])
export class DashboardLayout extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  slug!: string;

  @Column({ type: "boolean", default: false })
  isDefault!: boolean;

  @Column({ type: "text", nullable: true })
  icon?: string | null;

  @Column({ type: "text", nullable: true })
  subtitle?: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "boolean", default: false })
  published!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  viewToken?: string | null;
}
