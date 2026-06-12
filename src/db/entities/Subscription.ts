import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { BillingCycle, PaymentProvider, SubscriptionStatus } from "@/lib/billing/types";

@Entity({ name: "subscriptions" })
export class Subscription extends AppBaseEntity {
  @Column({ type: "uuid", unique: true })
  tenantId!: string;

  @Column({ type: "uuid" })
  planId!: string;

  @Column({ type: "text", default: "active" })
  status!: SubscriptionStatus;

  @Column({ type: "text", nullable: true })
  paymentProvider?: PaymentProvider | null;

  @Column({ type: "text", default: "monthly" })
  billingCycle!: BillingCycle;

  @Column({ type: "text", nullable: true })
  externalCustomerId?: string | null;

  @Column({ type: "text", nullable: true })
  externalSubscriptionId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  currentPeriodStart?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  currentPeriodEnd?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  gracePeriodEndsAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  canceledAt?: Date | null;

  @Column({ type: "boolean", default: false })
  cancelAtPeriodEnd!: boolean;
}
