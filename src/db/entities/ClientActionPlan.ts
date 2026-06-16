import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ActionPlanStatus = "active" | "completed" | "archived";

@Entity({ name: "client_action_plans" })
export class ClientActionPlan extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  generatedAt!: Date;

  @Column({ type: "text", default: "active" })
  status!: ActionPlanStatus;
}
