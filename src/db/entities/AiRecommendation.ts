import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type AiRecommendationStatus = "PENDING" | "APPLIED" | "DISMISSED";

@Entity({ name: "ai_recommendations" })
@Index(["tenantId", "createdAt"])
export class AiRecommendation extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text", nullable: true })
  targetId?: string | null; // campaign/adset/ad id

  @Column({ type: "text" })
  actionType!: string; // ALTER_BUDGET | PAUSE_AD | UPDATE_BID | ...

  @Column({ type: "jsonb" })
  payload!: unknown; // JSON estruturado (Gemini)

  @Column({ type: "text" })
  justification!: string;

  @Column({ type: "text", default: "PENDING" })
  status!: AiRecommendationStatus;

  @Column({ type: "jsonb", nullable: true })
  preview?: unknown | null; // de/para renderizável
}

