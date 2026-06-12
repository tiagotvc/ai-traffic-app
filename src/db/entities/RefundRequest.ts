import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { PaymentProvider, RefundRequestStatus } from "@/lib/billing/types";

@Entity({ name: "refund_requests" })
export class RefundRequest extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  invoiceId!: string;

  @Column({ type: "uuid" })
  requestedByUserId!: string;

  @Column({ type: "text" })
  provider!: PaymentProvider;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "text", default: "pending" })
  status!: RefundRequestStatus;

  @Column({ type: "text", nullable: true })
  externalRefundId?: string | null;

  @Column({ type: "uuid", nullable: true })
  reviewedByUserId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  reviewedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  reviewNote?: string | null;
}
