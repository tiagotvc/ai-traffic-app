import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Client } from "./Client";
import type { KeywordActionType, KeywordActionIntent } from "@/lib/google-ads-keyword-eval";

export type GoogleRecommendationStatus =
  | "PENDING"
  | "AUTO_APPLIED"
  | "APPLIED"
  | "DISMISSED"
  | "FAILED";

export type GoogleRecommendationSource = "rule" | "ai_refined";

/**
 * Fila de recomendações de palavras-chave do Google Ads (silo Google: ancorada em
 * `clientId`, como `GoogleCampaignMetricSnapshot`). Produzida pelo motor
 * determinístico (`google-ads-keyword-eval.ts`), opcionalmente refinada por IA.
 * `dedupeKey` garante idempotência: recompute atualiza a linha PENDING existente.
 * Nesta fase (M2a) nada é aplicado no Google — só leitura + persistência da fila.
 */
@Entity({ name: "google_keyword_recommendations" })
@Index(["tenantId", "clientId", "status", "createdAt"])
@Index(["clientId", "dedupeKey"], { unique: true })
export class GoogleKeywordRecommendation extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @ManyToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Column({ type: "text" })
  customerId!: string;

  @Column({ type: "text" })
  actionType!: KeywordActionType;

  @Column({ type: "text", nullable: true })
  campaignId?: string | null;

  @Column({ type: "text", nullable: true })
  campaignName?: string | null;

  @Column({ type: "text", nullable: true })
  adGroupId?: string | null;

  @Column({ type: "text", nullable: true })
  adGroupName?: string | null;

  @Column({ type: "text", nullable: true })
  criterionId?: string | null;

  @Column({ type: "text" })
  keywordText!: string;

  @Column({ type: "text", nullable: true })
  matchType?: string | null;

  @Column({ type: "jsonb", nullable: true })
  signals?: Record<string, number | string | boolean> | null;

  @Column({ type: "numeric", precision: 6, scale: 4, default: 0 })
  score!: string;

  @Column({ type: "numeric", precision: 6, scale: 4, default: 0 })
  confidence!: string;

  @Column({ type: "text", default: "rule" })
  source!: GoogleRecommendationSource;

  /** Intenção de ação normalizada (não é o corpo do mutate do Google). */
  @Column({ type: "jsonb" })
  intent!: KeywordActionIntent;

  @Column({ type: "text", nullable: true })
  ruleJustification?: string | null;

  @Column({ type: "text", nullable: true })
  aiJustification?: string | null;

  @Column({ type: "text", default: "PENDING" })
  status!: GoogleRecommendationStatus;

  @Column({ type: "bool", default: false })
  autoApplyEligible!: boolean;

  /** `EngineExecution` que aplicou esta recomendação (preenchido no M2b). */
  @Column({ type: "uuid", nullable: true })
  engineExecutionId?: string | null;

  @Column({ type: "text" })
  dedupeKey!: string;
}
