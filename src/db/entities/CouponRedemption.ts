import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "coupon_redemptions" })
export class CouponRedemption extends AppBaseEntity {
  @Column({ type: "uuid" })
  couponId!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  userId?: string | null;

  @Column({ type: "uuid", nullable: true })
  invoiceId?: string | null;

  @Column({ type: "int" })
  discountCents!: number;

  @Column({ type: "int" })
  finalAmountCents!: number;
}
