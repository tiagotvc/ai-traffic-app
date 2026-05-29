import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Client } from "./Client";

export type GoalObjective = "leads" | "sales" | "traffic";

@Entity({ name: "client_goals" })
export class ClientGoal extends AppBaseEntity {
  @Column({ type: "uuid", unique: true })
  clientId!: string;

  @OneToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Column({ type: "text", default: "leads" })
  objective!: GoalObjective;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpl?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpa?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  maxCpc?: string | null;

  @Column({ type: "numeric", precision: 10, scale: 4, nullable: true })
  minCtr?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 4, nullable: true })
  minRoas?: string | null;

  @Column({ type: "numeric", precision: 18, scale: 2, nullable: true })
  maxSpendWithoutConversion?: string | null;

  @Column({ type: "numeric", precision: 5, scale: 2, nullable: true })
  budgetAlertPercent?: string | null;

  @Column({ type: "int", default: 1 })
  windowDays!: number;

  @Column({ type: "bool", default: true })
  enabled!: boolean;
}
