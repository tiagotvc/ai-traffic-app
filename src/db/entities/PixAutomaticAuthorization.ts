import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type PixAutomaticAuthorizationStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "expired"
  | "refused";

@Entity({ name: "pix_automatic_authorizations" })
export class PixAutomaticAuthorization extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  subscriptionId!: string;

  @Column({ type: "text", unique: true })
  asaasAuthorizationId!: string;

  @Column({ type: "text" })
  asaasCustomerId!: string;

  @Column({ type: "text", default: "pending" })
  status!: PixAutomaticAuthorizationStatus;

  @Column({ type: "text" })
  frequency!: "MONTHLY" | "ANNUALLY";

  @Column({ type: "int" })
  valueCents!: number;

  @Column({ type: "date" })
  startDate!: string;

  @Column({ type: "date", nullable: true })
  finishDate?: string | null;

  /** Próxima data de vencimento para a qual o motor recorrente deve criar a cobrança. */
  @Column({ type: "date" })
  nextChargeDueDate!: string;

  /** Due date para a qual já criamos a instrução — evita criar a mesma cobrança duas vezes. */
  @Column({ type: "date", nullable: true })
  lastInstructionCreatedForDueDate?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastInstructionCreatedAt?: Date | null;
}
