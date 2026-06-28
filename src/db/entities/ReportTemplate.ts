import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ReportTemplateConfig = {
  reportType: "simple" | "complete";
  metrics: string[];
  periodPreset?: string | null;
};

/** Template de relatório (R3.11) — salva tipo + métricas + período padrão por tenant. */
@Entity({ name: "report_templates" })
@Index("idx_report_templates_tenant", ["tenantId", "createdAt"])
export class ReportTemplate extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "jsonb" })
  config!: ReportTemplateConfig;
}
