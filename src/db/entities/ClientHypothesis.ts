import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { LearningCategory } from "./ClientLearning";

export type HypothesisStatus =
  | "SUGGESTED"
  | "TESTING"
  | "CONFIRMED"
  | "REJECTED"
  | "PROMOTED";

export type HypothesisSource = "RULE" | "AI" | "MANUAL";

@Entity({ name: "client_hypotheses" })
@Index(["tenantId", "clientId", "createdAt"])
@Index(["tenantId", "clientId", "dedupeKey"], { unique: true, where: '"dedupeKey" IS NOT NULL' })
export class ClientHypothesis extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text" })
  category!: LearningCategory;

  @Column({ type: "smallint", default: 40 })
  confidenceScore!: number;

  @Column({ type: "text", default: "SUGGESTED" })
  status!: HypothesisStatus;

  @Column({ type: "text" })
  source!: HypothesisSource;

  @Column({ type: "jsonb", nullable: true })
  evidence?: Record<string, unknown> | null;

  @Column({ type: "uuid", nullable: true })
  promotedLearningId?: string | null;

  @Column({ type: "text", nullable: true })
  dedupeKey?: string | null;
}
