import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { AutomationRule } from "./AutomationRule";

export type PendingActionType =
  | "pause_campaign"
  | "adjust_budget_percent"
  | "reactivate_campaign"
  | "scale_gradual_step";

@Entity({ name: "automation_pending_actions" })
@Index(["tenantId", "status", "createdAt"])
@Index(["automationRuleId"])
export class AutomationPendingAction extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  automationRuleId!: string;

  @ManyToOne("AutomationRule", { onDelete: "CASCADE" })
  @JoinColumn({ name: "automationRuleId" })
  rule!: AutomationRule;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  metaCampaignId!: string;

  @Column({ type: "text", nullable: true })
  campaignName?: string | null;

  @Column({ type: "text" })
  actionType!: PendingActionType;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  budgetPercent?: string | null;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", default: "pending" })
  status!: "pending" | "approved" | "rejected";

  @Column({ type: "uuid", nullable: true })
  approvedBy?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  approvedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  rejectionReason?: string | null;
}
