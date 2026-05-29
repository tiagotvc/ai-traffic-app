import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "campaign_templates" })
export class CampaignTemplate extends AppBaseEntity {
  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "jsonb", default: () => `'{}'` })
  payload!: Record<string, unknown>;
}
