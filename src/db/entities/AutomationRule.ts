import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "automation_rules" })
export class AutomationRule extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "bool", default: true })
  enabled!: boolean;

  @Column({ type: "jsonb" })
  condition!: Record<string, unknown>;

  @Column({ type: "jsonb" })
  action!: Record<string, unknown>;
}
