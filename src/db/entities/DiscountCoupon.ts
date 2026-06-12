import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "discount_coupons" })
export class DiscountCoupon extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  code!: string;

  @Column({ type: "int" })
  percentOff!: number;

  /** null = ilimitado */
  @Column({ type: "int", nullable: true })
  maxUses?: number | null;

  @Column({ type: "int", default: 0 })
  usedCount!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  validFrom?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  validUntil?: Date | null;

  /** slugs de plano permitidos; null = todos */
  @Column({ type: "jsonb", nullable: true })
  allowedPlanSlugs?: string[] | null;

  /** valor mínimo cobrado após cupom (centavos BRL) */
  @Column({ type: "int", default: 100 })
  minChargeCents!: number;

  @Column({ type: "text", nullable: true })
  description?: string | null;
}
