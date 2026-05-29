import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Client } from "./Client";

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

  @OneToOne(() => Client, { onDelete: "CASCADE" })
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

  @Column({ type: "bool", default: false })
  automationEnabled!: boolean;

  @Column({ type: "text", nullable: true })
  targetingTemplateName?: string | null;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  updatedAt!: Date;
}
