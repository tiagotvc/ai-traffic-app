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

  /**
   * Modo de execução das ações destrutivas (pausar/ajustar orçamento/reativar): `alert` (só
   * avisa, nunca age), `approval` (cria `AutomationPendingAction`, aguarda aprovação humana),
   * `auto` (executa direto — comportamento histórico). Gateado por plano (`PlanLimits.automationTier
   * >= 2`) no motor — abaixo disso o motor força `auto` mesmo que a coluna diga outra coisa.
   */
  @Column({ type: "text", default: "auto" })
  executionMode!: "alert" | "approval" | "auto";
}
