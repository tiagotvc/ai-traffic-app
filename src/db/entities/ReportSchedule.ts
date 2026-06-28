import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "report_schedules" })
export class ReportSchedule extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "pdf" })
  format!: string;

  /** Canal de entrega ao cliente (v3): email_pdf | email_link | whatsapp. */
  @Column({ type: "text", default: "email_pdf" })
  deliveryChannel!: string;

  /** Tipo do relatório agendado (parametrizável): simple | complete. */
  @Column({ type: "text", default: "simple" })
  reportType!: string;

  /** Período preset do relatório agendado (ex.: last7, last30). Null = por frequência. */
  @Column({ type: "text", nullable: true })
  periodPreset?: string | null;

  /** Telefone do cliente (E.164) quando o canal é WhatsApp. */
  @Column({ type: "text", nullable: true })
  recipientPhone?: string | null;

  @Column({ type: "text", default: "weekly" })
  frequency!: string;

  @Column({ type: "int", nullable: true })
  dayOfWeek?: number | null;

  @Column({ type: "int", default: 12 })
  hourUtc!: number;

  @Column({ type: "jsonb", default: () => `'[]'` })
  recipients!: string[];

  @Column({ type: "bool", default: true })
  enabled!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastRunAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  nextRunAt?: Date | null;
}
