import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type TimelineEventType =
  | "learning_approved"
  | "learning_suggested"
  | "hypothesis_promoted"
  | "suggestion_executed"
  | "suggestion_created"
  | "metric_spike"
  | "sync_completed";

@Entity({ name: "client_timeline_events" })
@Index(["tenantId", "clientId", "createdAt"])
export class ClientTimelineEvent extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  type!: TimelineEventType;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  sourceId?: string | null;

  @Column({ type: "text", nullable: true })
  sourceType?: string | null;
}
