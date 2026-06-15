import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { InvoiceStatus, NfStatus, PaymentProvider } from "@/lib/billing/types";

@Entity({ name: "invoices" })
export class Invoice extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  subscriptionId?: string | null;

  @Column({ type: "uuid", nullable: true })
  planId?: string | null;

  @Column({ type: "text" })
  provider!: PaymentProvider;

  @Column({ type: "text", nullable: true })
  externalPaymentId?: string | null;

  @Column({ type: "int" })
  amountCents!: number;

  @Column({ type: "text", default: "BRL" })
  currency!: string;

  @Column({ type: "int", nullable: true })
  taxCents?: number | null;

  @Column({ type: "int", nullable: true })
  feeCents?: number | null;

  @Column({ type: "int", nullable: true })
  netCents?: number | null;

  @Column({ type: "text", default: "pending" })
  status!: InvoiceStatus;

  @Column({ type: "text", nullable: true })
  billingType?: string | null;

  @Column({ type: "text", nullable: true })
  billingCycle?: string | null;

  @Column({ type: "date", nullable: true })
  dueDate?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  paidAt?: Date | null;

  @Column({ type: "text", nullable: true })
  invoiceUrl?: string | null;

  @Column({ type: "text", nullable: true })
  pixQrCode?: string | null;

  @Column({ type: "text", nullable: true })
  pixCopyPaste?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  pixExpiresAt?: Date | null;

  @Column({ type: "text", default: "not_applicable" })
  nfStatus!: NfStatus;

  @Column({ type: "text", nullable: true })
  nfNumber?: string | null;

  @Column({ type: "text", nullable: true })
  nfPdfUrl?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  nfIssuedAt?: Date | null;

  @Column({ type: "text", nullable: true })
  asaasInvoiceId?: string | null;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "uuid", nullable: true })
  couponId?: string | null;

  @Column({ type: "int", nullable: true })
  couponDiscountCents?: number | null;
}
