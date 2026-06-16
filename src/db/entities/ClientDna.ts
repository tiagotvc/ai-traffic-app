import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type DnaBucket = { works: string[]; doesntWork: string[] };

const emptyBucket = () => `'{"works":[],"doesntWork":[]}'`;

@Entity({ name: "client_dna" })
@Index(["clientId"], { unique: true })
export class ClientDna extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  audiences!: DnaBucket;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  creatives!: DnaBucket;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  placements!: DnaBucket;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  offers!: DnaBucket;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  copy!: DnaBucket;

  @Column({ type: "jsonb", default: () => emptyBucket() })
  seasonality!: DnaBucket;

  @Column({ type: "text", default: "" })
  summaryText!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastDerivedAt?: Date | null;

  @Column({ type: "jsonb", default: () => "'{}'" })
  manualOverrides!: Record<string, unknown>;

  @Column({ type: "int", default: 0 })
  approvedLearningCount!: number;
}
