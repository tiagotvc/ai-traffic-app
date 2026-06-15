import { Column, Entity, Unique } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type TenantAddonBonuses = {
  extraClients: number;
  extraAdAccounts: number;
  extraMembers: number;
  extraAutomationRules: number;
  extraAiRequestsPerMonth: number;
  extraScheduledReports: number;
};

export const EMPTY_TENANT_ADDON_BONUSES: TenantAddonBonuses = {
  extraClients: 0,
  extraAdAccounts: 0,
  extraMembers: 0,
  extraAutomationRules: 0,
  extraAiRequestsPerMonth: 0,
  extraScheduledReports: 0
};

@Entity({ name: "tenant_addons" })
@Unique(["tenantId"])
export class TenantAddon extends AppBaseEntity {
  @Column({ type: "uuid", unique: true })
  tenantId!: string;

  @Column({ type: "int", default: 0 })
  extraClients!: number;

  @Column({ type: "int", default: 0 })
  extraAdAccounts!: number;

  @Column({ type: "int", default: 0 })
  extraMembers!: number;

  @Column({ type: "int", default: 0 })
  extraAutomationRules!: number;

  @Column({ type: "int", default: 0 })
  extraAiRequestsPerMonth!: number;

  @Column({ type: "int", default: 0 })
  extraScheduledReports!: number;

  @Column({ type: "text", nullable: true })
  adminNote?: string | null;
}
