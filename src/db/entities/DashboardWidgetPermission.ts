import { Column, Entity, Unique } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_widget_permissions" })
@Unique(["widgetType"])
export class DashboardWidgetPermission extends AppBaseEntity {
  @Column({ type: "text" })
  widgetType!: string;

  @Column({ type: "text", default: "advanced" })
  minPlanSlug!: string;

  @Column({ type: "text", nullable: true })
  requiredAddon?: string | null;

  @Column({ type: "boolean", default: true })
  allowResize!: boolean;

  @Column({ type: "boolean", default: false })
  isAiWidget!: boolean;
}
