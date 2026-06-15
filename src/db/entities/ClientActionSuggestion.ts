import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ActionSuggestionType =
  | "scale_budget"
  | "pause_campaign"
  | "duplicate_audience"
  | "refresh_creative"
  | "review_campaign";

export type ActionSuggestionSource = "RULE" | "AI";
export type ActionSuggestionStatus = "PENDING" | "EXECUTED" | "ACKNOWLEDGED" | "REJECTED";

@Entity({ name: "client_action_suggestions" })
@Index(["tenantId", "clientId", "createdAt"])
@Index(["tenantId", "clientId", "status"])
@Index(["tenantId", "clientId", "dedupeKey"], { unique: true, where: '"dedupeKey" IS NOT NULL' })
export class ClientActionSuggestion extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text", nullable: true })
  metaCampaignId?: string | null;

  @Column({ type: "uuid", nullable: true })
  linkedLearningId?: string | null;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text" })
  actionType!: ActionSuggestionType;

  @Column({ type: "jsonb", default: () => "'{}'" })
  actionPayload!: Record<string, unknown>;

  @Column({ type: "text" })
  source!: ActionSuggestionSource;

  @Column({ type: "text", default: "PENDING" })
  status!: ActionSuggestionStatus;

  @Column({ type: "jsonb", nullable: true })
  evidence?: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  dedupeKey?: string | null;

  @Column({ type: "uuid", nullable: true })
  resolvedByUserId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  resolvedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  resolutionNote?: string | null;
}
