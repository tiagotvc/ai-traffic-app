import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { AdAccount } from "./AdAccount";
import type { Client } from "./Client";

@Entity({ name: "campaign_goals" })
@Index(["clientId", "metaCampaignId"], { unique: true })
export class CampaignGoal extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @ManyToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Column({ type: "uuid" })
  adAccountId!: string;

  @ManyToOne("AdAccount", { onDelete: "CASCADE" })
  @JoinColumn({ name: "adAccountId" })
  adAccount!: AdAccount;

  @Column({ type: "text" })
  metaCampaignId!: string;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpl?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpa?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpc?: string | null;

  @Column({ type: "numeric", precision: 10, scale: 4, nullable: true })
  minCtr?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  minRoas?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 2, nullable: true })
  maxSpendWithoutConversion?: string | null;

  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
  budgetAlertPercent?: string | null;

  @Column({ type: "int", nullable: true })
  windowDays?: number | null;

  @Column({ type: "bool", default: true })
  enabled!: boolean;
}
