import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "sync_runs" })
export class SyncRun extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text", default: "sync" })
  runType!: "sync" | "historical_backfill";

  @Column({ type: "int", nullable: true })
  depthDays?: number | null;

  @Column({ type: "int", default: 0 })
  daysDone!: number;

  @Column({ type: "int", default: 0 })
  daysTotal!: number;

  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column({ type: "int", default: 0 })
  accountsTotal!: number;

  @Column({ type: "int", default: 0 })
  accountsDone!: number;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  startedAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  finishedAt?: Date | null;
}
