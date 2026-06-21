import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_ai_widgets" })
@Index(["tenantId", "userId"])
export class DashboardAiWidget extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid", nullable: true })
  layoutId?: string | null;

  @Column({ type: "text" })
  prompt!: string;

  @Column({ type: "jsonb", default: {} })
  generatedConfig!: Record<string, unknown>;

  @Column({ type: "text" })
  widgetType!: string;

  @Column({ type: "text", default: "draft" })
  status!: string;
}
