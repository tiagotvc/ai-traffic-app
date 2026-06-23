import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import type { Client } from "./Client";

export type ClientTargeting = {
  countries: string[];
  age_min: number;
  age_max: number;
  languages?: string[];
};

export type SyncPriority = "critical" | "normal" | "low";

@Entity({ name: "client_meta_settings" })
export class ClientMetaSettings {
  @Column({ type: "uuid", primary: true })
  clientId!: string;

  @OneToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Column({ type: "text", nullable: true })
  defaultAdAccountId?: string | null;

  @Column({ type: "text", nullable: true })
  metaPixelId?: string | null;

  @Column({ type: "text", nullable: true })
  metaLeadFormId?: string | null;

  @Column({ type: "text", nullable: true })
  instagramActorId?: string | null;

  @Column({ type: "text", default: "leads" })
  defaultObjective!: string;

  @Column({ type: "text", default: "LEARN_MORE" })
  defaultCta!: string;

  @Column({ type: "numeric", precision: 18, scale: 2, nullable: true })
  defaultDailyBudgetBrl?: string | null;

  @Column({ type: "jsonb" })
  targeting!: ClientTargeting;

  @Column({ type: "jsonb" })
  specialAdCategories!: string[];

  @Column({ type: "text", nullable: true })
  campaignNamePrefix?: string | null;

  @Column({ type: "bool", default: true })
  syncEnabled!: boolean;

  @Column({ type: "text", default: "normal" })
  syncPriority!: SyncPriority;

  @Column({ type: "jsonb" })
  defaultCustomAudienceIds!: string[];

  @Column({ type: "jsonb" })
  defaultExcludedAudienceIds!: string[];

  // Dashboard: default metrics to show in charts (array of MetricKey)
  @Column({ type: "jsonb", nullable: true })
  defaultDashboardMetrics?: string[] | null;

  // Metric to show in clients summary (e.g., 'roas')
  @Column({ type: "text", nullable: true })
  defaultClientMetric?: string | null;

  @Column({ type: "bool", default: false })
  automationEnabled!: boolean;

  @Column({ type: "text", nullable: true })
  targetingTemplateName?: string | null;

  @Column({ type: "jsonb", nullable: true })
  defaultUtm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  } | null;

  /** Free-text commercial address for map centering in campaign creator */
  @Column({ type: "text", nullable: true })
  commercialAddress?: string | null;

  @Column({ type: "text", nullable: true })
  commercialAddressNormalized?: string | null;

  @Column({ type: "double precision", nullable: true })
  commercialLatitude?: number | null;

  @Column({ type: "double precision", nullable: true })
  commercialLongitude?: number | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
