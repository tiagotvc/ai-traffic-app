import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { PaymentProvider } from "@/lib/billing/types";

@Entity({ name: "billing_customers" })
export class BillingCustomer extends AppBaseEntity {
  @Column({ type: "uuid", unique: true })
  tenantId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ type: "text", nullable: true })
  cpfCnpj?: string | null;

  @Column({ type: "text", nullable: true })
  phone?: string | null;

  @Column({ type: "text", nullable: true })
  postalCode?: string | null;

  @Column({ type: "text", nullable: true })
  address?: string | null;

  @Column({ type: "text", nullable: true })
  addressNumber?: string | null;

  @Column({ type: "text", nullable: true })
  city?: string | null;

  @Column({ type: "text", nullable: true })
  state?: string | null;

  @Column({ type: "text", nullable: true })
  asaasCustomerId?: string | null;

  @Column({ type: "text", nullable: true })
  stripeCustomerId?: string | null;

  @Column({ type: "text", nullable: true })
  preferredProvider?: PaymentProvider | null;
}
