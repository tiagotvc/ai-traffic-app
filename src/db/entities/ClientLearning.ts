import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type LearningCategory =
  | "CREATIVE"
  | "AUDIENCE"
  | "OFFER"
  | "COPY"
  | "BUDGET"
  | "LANDING_PAGE"
  | "SEASONALITY"
  | "GENERAL";

export type LearningImpact = "LOW" | "MEDIUM" | "HIGH";
export type LearningConfidence = "LOW" | "MEDIUM" | "HIGH";
export type LearningSource = "MANUAL" | "RULE" | "AI" | "IMPORTED";
export type LearningStatus = "SUGGESTED" | "APPROVED" | "REJECTED" | "ARCHIVED";

@Entity({ name: "client_learnings" })
@Index(["tenantId", "clientId", "createdAt"])
@Index(["tenantId", "clientId", "status"])
@Index(["tenantId", "clientId", "dedupeKey"], { unique: true, where: '"dedupeKey" IS NOT NULL' })
export class ClientLearning extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text", nullable: true })
  metaCampaignId?: string | null;

  @Column({ type: "text", nullable: true })
  metaAdId?: string | null;

  @Column({ type: "uuid", nullable: true })
  creativeAssetId?: string | null;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text" })
  category!: LearningCategory;

  @Column({ type: "text", default: "MEDIUM" })
  impact!: LearningImpact;

  @Column({ type: "text", default: "MEDIUM" })
  confidence!: LearningConfidence;

  @Column({ type: "text" })
  source!: LearningSource;

  @Column({ type: "text", default: "APPROVED" })
  status!: LearningStatus;

  @Column({ type: "jsonb", default: () => "'[]'" })
  tags!: string[];

  @Column({ type: "jsonb", nullable: true })
  metricSnapshot?: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  evidence?: Record<string, unknown> | null;

  @Column({ type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @Column({ type: "text", nullable: true })
  dedupeKey?: string | null;
}
