import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Client } from "./Client";

/**
 * Snapshot diário de campanha do Google Ads. Silo separado do Meta: ancorado em
 * `clientId` (o Google não tem linha em `ad_accounts`). Chave única
 * (clientId, campaignId, day). Só leitura/reporting — não afeta o fluxo Meta.
 */
@Entity({ name: "google_campaign_metric_snapshots" })
@Index(["clientId", "campaignId", "day"], { unique: true })
export class GoogleCampaignMetricSnapshot extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @ManyToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  /** Customer ID Google Ads (dígitos) de onde veio a métrica. */
  @Column({ type: "text" })
  customerId!: string;

  @Column({ type: "text" })
  campaignId!: string;

  @Column({ type: "text", nullable: true })
  campaignName?: string | null;

  @Column({ type: "text", nullable: true })
  status?: string | null;

  @Column({ type: "text", nullable: true })
  channelType?: string | null;

  @Column({ type: "date" })
  day!: string;

  @Column({ type: "bigint", default: 0 })
  impressions!: string;

  @Column({ type: "bigint", default: 0 })
  clicks!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, default: 0 })
  cost!: string;

  // Google permite conversões fracionadas — numeric, não bigint.
  @Column({ type: "numeric", precision: 18, scale: 2, default: 0 })
  conversions!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, default: 0 })
  conversionsValue!: string;

  @Column({ type: "numeric", precision: 10, scale: 4, default: 0 })
  ctr!: string;

  @Column({ type: "numeric", precision: 18, scale: 4, default: 0 })
  averageCpc!: string;
}
