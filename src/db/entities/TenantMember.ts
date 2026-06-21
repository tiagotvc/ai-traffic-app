import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";

import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";
import type { User } from "./User";

export type TenantMemberRole = "admin" | "member";

@Entity({ name: "tenant_members" })
@Unique(["tenantId", "userId"])
export class TenantMember extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text", default: "member" })
  role!: TenantMemberRole;

  /** Métricas do gráfico Performance Geral (Destaques) — preferência do usuário no workspace. */
  @Column({ type: "jsonb", nullable: true })
  dashboardChartMetrics?: string[] | null;

  /** Métrica exibida nos cards da seção Clientes (Destaques). */
  @Column({ type: "text", nullable: true })
  dashboardClientMetric?: string | null;

  /** Seções visíveis e KPIs principais do Destaques — preferência por usuário. */
  @Column({ type: "jsonb", nullable: true })
  dashboardLayout?: Record<string, unknown> | null;

  /** Visões de colunas salvas para tabelas de campanhas. */
  @Column({ type: "jsonb", nullable: true })
  campaignTableLayouts?: Record<string, unknown>[] | null;

  @Column({ type: "text", nullable: true })
  activeCampaignTableLayoutId?: string | null;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}
