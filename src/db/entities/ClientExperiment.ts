import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "client_experiments" })
export class ClientExperiment extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  variantA!: string;

  @Column({ type: "text" })
  variantB!: string;

  @Column({ type: "text", nullable: true })
  winner?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metrics?: Record<string, unknown> | null;

  @Column({ type: "text", nullable: true })
  conclusion?: string | null;

  @Column({ type: "uuid", nullable: true })
  hypothesisId?: string | null;

  /** Elo Experiment→Learning (Fase 3): aprendizado publicado quando o A/B conclui. */
  @Column({ type: "uuid", nullable: true })
  resultLearningId?: string | null;

  @Column({ type: "text", nullable: true })
  metaCampaignId?: string | null;

  @Column({ type: "int", nullable: true })
  horizonDays?: number | null;

  @Column({ type: "jsonb", nullable: true })
  baselineForecast?: Record<string, unknown> | null;

  @Column({ type: "jsonb", nullable: true })
  actualMetrics?: Record<string, unknown> | null;
}
