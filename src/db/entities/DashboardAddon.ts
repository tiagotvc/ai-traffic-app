import { Column, Entity, Unique } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_addons" })
@Unique(["tenantId", "addonKey"])
export class DashboardAddon extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  addonKey!: string;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @Column({ type: "int", default: 0 })
  priceCents!: number;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt?: Date | null;
}
