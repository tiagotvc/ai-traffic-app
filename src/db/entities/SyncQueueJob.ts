import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "sync_queue_jobs" })
export class SyncQueueJob extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  syncRunId?: string | null;

  @Column({ type: "uuid" })
  adAccountId!: string;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "int", default: 50 })
  priority!: number;

  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  @Column({ type: "timestamptz" })
  scheduledAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
