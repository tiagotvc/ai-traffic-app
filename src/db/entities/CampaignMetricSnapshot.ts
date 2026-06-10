import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { AdAccount } from "./AdAccount";

@Entity({ name: "campaign_metric_snapshots" })
@Index(["adAccountId", "metaCampaignId", "day"], { unique: true })
export class CampaignMetricSnapshot extends AppBaseEntity {
  @Column({ type: "uuid" })
  adAccountId!: string;

  @ManyToOne("AdAccount", { onDelete: "CASCADE" })
  @JoinColumn({ name: "adAccountId" })
  adAccount!: AdAccount;

  @Column({ type: "text" })
  metaCampaignId!: string;

  @Column({ type: "text", nullable: true })
  campaignName?: string | null;

  @Column({ type: "date" })
  day!: string;

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

  @Column({ type: "bigint", default: 0 })
  leads!: string;

  @Column({ type: "bigint", default: 0 })
  reach!: string;

  @Column({ type: "bigint", default: 0 })
  messages!: string;

  @Column({ type: "numeric", precision: 18, scale: 4, default: 0 })
  roas!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, nullable: true })
  dailyBudget?: string | null;

  @Column({ type: "text", nullable: true })
  campaignStatus?: string | null;
}
