import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { ClientActionPlan } from "./ClientActionPlan";

export type ActionPlanItemStatus = "pending" | "done" | "skipped";

@Entity({ name: "client_action_plan_items" })
export class ClientActionPlanItem extends AppBaseEntity {
  @Column({ type: "uuid" })
  planId!: string;

  @ManyToOne("ClientActionPlan", { onDelete: "CASCADE" })
  @JoinColumn({ name: "planId" })
  plan!: ClientActionPlan;

  @Column({ type: "text" })
  title!: string;

  @Column({ type: "text", default: "pending" })
  status!: ActionPlanItemStatus;

  @Column({ type: "date", nullable: true })
  dueDate?: string | null;

  @Column({ type: "uuid", nullable: true })
  suggestionId?: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}
