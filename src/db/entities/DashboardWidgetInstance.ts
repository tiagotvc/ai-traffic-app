import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "dashboard_widget_instances" })
@Index(["layoutId", "sortOrder"])
export class DashboardWidgetInstance extends AppBaseEntity {
  @Column({ type: "uuid" })
  layoutId!: string;

  @Column({ type: "text" })
  widgetType!: string;

  @Column({ type: "text", nullable: true })
  title?: string | null;

  @Column({ type: "int", default: 0 })
  x!: number;

  @Column({ type: "int", default: 0 })
  y!: number;

  @Column({ type: "int", default: 4 })
  w!: number;

  @Column({ type: "int", default: 2 })
  h!: number;

  @Column({ type: "text", default: "md" })
  size!: string;

  @Column({ type: "boolean", default: true })
  visible!: boolean;

  @Column({ type: "jsonb", default: {} })
  config!: Record<string, unknown>;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}
