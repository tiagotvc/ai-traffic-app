import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ResearchFindingCategory =
  | "competitor"
  | "trend"
  | "creative"
  | "offer"
  | "audience"
  | "news"
  | "product"
  | "other";

/**
 * Achados do Orion Research (docs/orion-research): a tabela genérica que desacopla o
 * Cortex das fontes. Toda fonte (Meta Ad Library, Trends, YouTube… e as futuras TikTok,
 * Reddit, LinkedIn) grava no MESMO contrato — o Cortex consome "achados", nunca fontes.
 * Adicionar fonte nova não muda nada aqui nem em quem lê.
 */
@Entity({ name: "research_findings" })
@Index(["tenantId", "createdAt"])
@Index(["tenantId", "source", "createdAt"])
@Index(["tenantId", "entity", "createdAt"])
export class ResearchFinding extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  /** Id da fonte (ver RESEARCH_SOURCES): meta_ad_library, google_trends, youtube… */
  @Column({ type: "text" })
  source!: string;

  @Column({ type: "text" })
  category!: ResearchFindingCategory;

  /** O que foi pesquisado/monitorado: nicho, concorrente, query, produto. */
  @Column({ type: "text" })
  entity!: string;

  @Column({ type: "text", nullable: true })
  title?: string | null;

  @Column({ type: "text" })
  summary!: string;

  /** 0–100 quando a fonte/síntese fornece. */
  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
  confidence?: string | null;

  /** Evidência bruta da fonte (links, contagens, amostras). */
  @Column({ type: "jsonb", nullable: true })
  evidence?: Record<string, unknown> | null;

  /** Job de pesquisa que gerou o achado (futuro: research jobs agendados). */
  @Column({ type: "uuid", nullable: true })
  researchJobId?: string | null;
}
