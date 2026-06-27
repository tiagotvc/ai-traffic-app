import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/** Log de eventos enviados via Conversions API (observabilidade — P0.4). */
@Entity({ name: "capi_event_logs" })
@Index("idx_capi_event_logs_client", ["tenantId", "clientId", "createdAt"])
export class CapiEventLog extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text", nullable: true })
  pixelId?: string | null;

  @Column({ type: "text" })
  eventName!: string;

  @Column({ type: "boolean", default: false })
  success!: boolean;

  @Column({ type: "int", nullable: true })
  eventsReceived?: number | null;

  @Column({ type: "text", nullable: true })
  error?: string | null;

  @Column({ type: "boolean", default: false })
  test!: boolean;
}
