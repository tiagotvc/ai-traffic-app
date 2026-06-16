import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "campaign_type_definitions" })
@Index(["tenantId"])
export class CampaignTypeDefinition extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  name!: string;

  /** MetricKey[] — métricas sugeridas para este tipo */
  @Column({ type: "jsonb", default: () => `'[]'` })
  metrics!: string[];

  @Column({ type: "uuid" })
  createdByUserId!: string;

  /** true = visível para todo o workspace; false = só o criador */
  @Column({ type: "boolean", default: true })
  shared!: boolean;
}
