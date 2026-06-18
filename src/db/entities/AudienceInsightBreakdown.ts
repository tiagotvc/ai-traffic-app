import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity, jsonColumn } from "./_shared";

@Entity({ name: "audience_insight_breakdowns" })
@Index(["clientId", "metaAdAccountId", "breakdownType", "breakdownValue", "periodDays"], {
  unique: true
})
export class AudienceInsightBreakdown extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text" })
  breakdownType!: string;

  @Column({ type: "text" })
  breakdownValue!: string;

  @Column({ type: "int", default: 30 })
  periodDays!: number;

  @Column({ type: "numeric", precision: 14, scale: 2, default: "0" })
  spend!: string;

  @Column({ type: "numeric", precision: 14, scale: 2, default: "0" })
  conversions!: string;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  roas?: string | null;

  @Column({ type: "numeric", precision: 14, scale: 2, nullable: true })
  cpa?: string | null;

  @jsonColumn()
  rawRow?: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  syncedAt?: Date | null;
}
