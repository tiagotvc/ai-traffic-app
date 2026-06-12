import { Column, Entity } from "typeorm";
import { AppBaseEntity, jsonColumn } from "./_shared";
import type { BillingJobStatus } from "@/lib/billing/types";

@Entity({ name: "billing_jobs" })
export class BillingJob extends AppBaseEntity {
  @Column({ type: "text" })
  type!: string;

  @jsonColumn()
  payload!: Record<string, unknown>;

  @Column({ type: "text", default: "pending" })
  status!: BillingJobStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "timestamptz" })
  runAfter!: Date;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
