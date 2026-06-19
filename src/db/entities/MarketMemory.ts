import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

export type MarketCoverageLevel = "full" | "partial" | "empty";

@Entity({ name: "market_memories" })
@Index(["tenantId", "clientId"], { unique: true })
export class MarketMemory extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text", nullable: true })
  niche?: string | null;

  @Column({ type: "text", nullable: true })
  marketCountry?: string | null;

  @Column({ type: "jsonb", default: [] })
  patternsJson!: unknown;

  @Column({ type: "jsonb", default: {} })
  rawStatsJson!: unknown;

  @Column({ type: "text", default: "empty" })
  coverageLevel!: MarketCoverageLevel;

  @Column({ type: "int", default: 0 })
  adsAnalyzed!: number;

  @Column({ type: "int", default: 0 })
  competitorsScanned!: number;

  @Column({ type: "timestamptz" })
  fetchedAt!: Date;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;
}
