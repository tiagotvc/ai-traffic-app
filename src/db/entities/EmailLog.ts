import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type EmailLogKind =
  | "welcome"
  | "trial_started"
  | "trial_3_days"
  | "trial_ending"
  | "subscription_ending"
  | "renewal_5_days";

/** Registro de cada tentativa de envio de e-mail transacional (visibilidade + reenvio manual). */
@Entity({ name: "email_logs" })
export class EmailLog extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  kind!: EmailLogKind;

  @Column({ type: "text" })
  to!: string;

  /** Dados necessários para reenviar sem precisar refazer as consultas originais. */
  @Column({ type: "jsonb" })
  payload!: Record<string, unknown>;

  @Column({ type: "boolean" })
  sent!: boolean;

  @Column({ type: "text", nullable: true })
  error?: string | null;
}
