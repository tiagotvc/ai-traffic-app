import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "custom_metrics" })
@Index(["tenantId"])
export class CustomMetric extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  formula!: string;

  @Column({ type: "text", default: "number" })
  format!: string;

  @Column({ type: "uuid" })
  createdByUserId!: string;
}
