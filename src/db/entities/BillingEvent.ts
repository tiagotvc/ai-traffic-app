import { Column, Entity } from "typeorm";
import { AppBaseEntity, jsonColumn } from "./_shared";

@Entity({ name: "billing_events" })
export class BillingEvent extends AppBaseEntity {
  @Column({ type: "uuid", nullable: true })
  tenantId?: string | null;

  @Column({ type: "text" })
  provider!: string;

  @Column({ type: "text" })
  eventType!: string;

  @Column({ type: "text", unique: true })
  idempotencyKey!: string;

  @jsonColumn()
  payload?: Record<string, unknown> | null;

  @Column({ type: "timestamptz", nullable: true })
  processedAt?: Date | null;
}
