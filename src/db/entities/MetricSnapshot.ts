import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import { AdAccount } from "./AdAccount";

@Entity({ name: "metric_snapshots" })
@Index(["adAccountId", "day"], { unique: true })
export class MetricSnapshot extends AppBaseEntity {
  @Column({ type: "uuid" })
  adAccountId!: string;

  @ManyToOne(() => AdAccount, { onDelete: "CASCADE" })
  @JoinColumn({ name: "adAccountId" })
  adAccount!: AdAccount;

  @Column({ type: "date" })
  day!: string; // YYYY-MM-DD

  @Column({ type: "numeric", precision: 18, scale: 2, default: 0 })
  spend!: string;

  @Column({ type: "bigint", default: 0 })
  impressions!: string;

  @Column({ type: "bigint", default: 0 })
  clicks!: string;

  @Column({ type: "numeric", precision: 10, scale: 4, default: 0 })
  ctr!: string;

  @Column({ type: "numeric", precision: 18, scale: 4, default: 0 })
  cpc!: string;

  @Column({ type: "bigint", default: 0 })
  conversions!: string;

  @Column({ type: "numeric", precision: 18, scale: 4, default: 0 })
  roas!: string;
}

