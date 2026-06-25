import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

import type { AiCreditWeights, AiDistributionMode } from "@/lib/ai-credits/types";

@Entity({ name: "tenant_ai_policies" })
export class TenantAiPolicy {
  @PrimaryColumn({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text", default: "shared_pool" })
  distributionMode!: AiDistributionMode;

  @Column({ type: "int", default: 80 })
  alertThresholdPercent!: number;

  @Column({ type: "int", default: 0 })
  reservePercent!: number;

  @Column({ type: "int", nullable: true })
  defaultClientMonthlyCap?: number | null;

  @Column({ type: "jsonb", nullable: true })
  customWeights?: Partial<AiCreditWeights> | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
