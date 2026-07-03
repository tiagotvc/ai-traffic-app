import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** Execução de um scientist dentro de um experimento do Laboratory (tabela da 0037, snake_case). */
@Entity({ name: "labs_agent_runs" })
@Index(["experimentId"])
export class LabsAgentRun {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "experiment_id", type: "uuid" })
  experimentId!: string;

  @Column({ name: "scientist_id", type: "text" })
  scientistId!: string;

  @Column({ type: "text" })
  status!: string;

  @Column({ type: "text", nullable: true })
  summary?: string | null;

  @Column({ name: "credits_used", type: "int", default: 0 })
  creditsUsed!: number;

  @Column({ name: "duration_ms", type: "int", nullable: true })
  durationMs?: number | null;

  @Column({ type: "jsonb", nullable: true })
  errors?: Record<string, unknown> | null;

  @CreateDateColumn({ name: "started_at", type: "timestamptz" })
  startedAt!: Date;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt?: Date | null;
}
