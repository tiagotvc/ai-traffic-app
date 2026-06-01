import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type AlertType =
  | "CONVERSION_DROP"
  | "BUDGET_NEAR_LIMIT"
  | "ROAS_ABOVE_TARGET"
  | "CPL_ABOVE_MAX"
  | "CPA_ABOVE_MAX"
  | "CPC_ABOVE_MAX"
  | "CTR_BELOW_MIN"
  | "ROAS_BELOW_MIN"
  | "SPEND_NO_CONVERSION"
  | "OTHER";

export type AlertSeverity = "critical" | "warning";

@Entity({ name: "alerts" })
@Index(["tenantId", "createdAt"])
@Index(["tenantId", "type", "clientId", "metaCampaignId", "dedupDay"], { unique: true })
export class Alert extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "uuid", nullable: true })
  adAccountId?: string | null;

  @Column({ type: "text", nullable: true })
  metaCampaignId?: string | null;

  @Column({ type: "text" })
  type!: AlertType;

  @Column({ type: "text", default: "critical" })
  severity!: AlertSeverity;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", nullable: true })
  metricKey?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  actualValue?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  thresholdValue?: string | null;

  @Column({ type: "date", nullable: true })
  dedupDay?: string | null;

  @Column({ type: "bool", default: false })
  dismissed!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  snoozedUntil?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  acknowledgedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  acknowledgedBy?: string | null;
}
