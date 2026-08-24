import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

/**
 * Controla quais linhas de PLAN_DISPLAY_ROWS (plan-display-registry.ts) aparecem no
 * card compacto da landing e/ou no comparativo completo — editável pelo admin em
 * /admin/billing/plans, sem precisar de deploy.
 */
@Entity({ name: "plan_feature_visibility" })
export class PlanFeatureVisibility extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  featureKey!: string;

  @Column({ type: "boolean", default: true })
  showCompact!: boolean;

  @Column({ type: "boolean", default: true })
  showFull!: boolean;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;
}
