import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * Experimento de pesquisa do Laboratory (kind "research" no agregado — docs/orion-architecture
 * §2.2). Tabela criada na 0037 com colunas snake_case e SEM updatedAt — a entity espelha o
 * schema existente (Fase 3 trouxe o acesso do app para TypeORM; o scientists-worker externo
 * continua escrevendo `labs_findings`/`labs_hypotheses`/`labs_credits_usage` direto).
 */
@Entity({ name: "labs_experiments" })
@Index(["tenantId", "createdAt"])
export class LabsExperiment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "tenant_id", type: "uuid" })
  tenantId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "client_id", type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  product!: string;

  @Column({ type: "text", nullable: true })
  niche?: string | null;

  @Column({ type: "text", nullable: true })
  market?: string | null;

  @Column({ type: "text", nullable: true })
  country?: string | null;

  @Column({ type: "text", nullable: true })
  language?: string | null;

  @Column({ type: "text", nullable: true })
  objective?: string | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  competitors!: string[];

  @Column({ name: "website_url", type: "text", nullable: true })
  websiteUrl?: string | null;

  @Column({ name: "selected_scientists", type: "jsonb", default: () => "'[]'" })
  selectedScientists!: string[];

  @Column({ name: "selected_sources", type: "jsonb", nullable: true })
  selectedSources?: string[] | null;

  @Column({ type: "text", default: "draft" })
  status!: string;

  @Column({ name: "estimated_credits", type: "int", default: 0 })
  estimatedCredits!: number;

  @Column({ name: "credits_used", type: "int", default: 0 })
  creditsUsed!: number;

  @Column({ name: "max_credits", type: "int", nullable: true })
  maxCredits?: number | null;

  @Column({ name: "max_duration_minutes", type: "int", nullable: true })
  maxDurationMinutes?: number | null;

  @Column({ type: "jsonb", nullable: true })
  dossier?: Record<string, unknown> | null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage?: string | null;

  /** Elo Hypothesis→Experiment (Fase 3): de qual hipótese este experimento nasceu. */
  @Column({ name: "hypothesis_id", type: "uuid", nullable: true })
  hypothesisId?: string | null;

  /** Elo Experiment→Learning (Fase 3): aprendizado publicado na conclusão. */
  @Column({ name: "result_learning_id", type: "uuid", nullable: true })
  resultLearningId?: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "started_at", type: "timestamptz", nullable: true })
  startedAt?: Date | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt?: Date | null;
}
