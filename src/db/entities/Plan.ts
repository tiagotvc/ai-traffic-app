import { Column, Entity } from "typeorm";
import { AppBaseEntity, jsonColumn } from "./_shared";
import type { ExternalPrices, PlanLimits } from "@/lib/billing/types";

@Entity({ name: "plans" })
export class Plan extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  slug!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "int", default: 0 })
  priceMonthlyCents!: number;

  @Column({ type: "int", default: 0 })
  priceYearlyCents!: number;

  @jsonColumn()
  limits!: PlanLimits;

  @jsonColumn()
  externalPrices?: ExternalPrices | null;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "int", default: 0 })
  trialDays!: number;

  @Column({ type: "text", default: "USD" })
  currency!: string;
}
