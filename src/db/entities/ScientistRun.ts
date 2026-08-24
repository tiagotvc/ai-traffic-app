import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ScientistRunFinding = {
  type: string;
  title: string;
  body: string;
  evidence?: Record<string, unknown> | null;
};

/**
 * Log de execução de um Scientist — 1 linha por vez que `runScientistSkill()` roda (ran
 * ou skipped), gravada best-effort logo após a chamada (`src/lib/commander/scientist-runs.ts`).
 * Base do log por cientista na tela `/commander/scientists`.
 */
@Entity({ name: "scientist_runs" })
@Index(["tenantId", "scientistId", "createdAt"])
@Index(["tenantId", "clientId", "createdAt"])
export class ScientistRun extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  /** Mesmo id de `SCIENTIST_ROWS`/skill (`competitor`, `geo`, `trend`...), sem prefixo de flag. */
  @Column({ type: "text" })
  scientistId!: string;

  @Column({ type: "boolean" })
  ran!: boolean;

  /** Motivo do skip quando `ran = false` (ex.: "sem nicho definido"). */
  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "int", nullable: true })
  itemsAnalyzed?: number | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  findings!: ScientistRunFinding[];

  @Column({ type: "jsonb", nullable: true })
  sources?: string[] | null;

  @Column({ type: "text", nullable: true })
  summary?: string | null;

  @Column({ type: "int", nullable: true })
  confidence?: number | null;
}
