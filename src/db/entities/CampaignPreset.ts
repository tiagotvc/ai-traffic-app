import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/** Tipo/pré-configuração escolhido para uma campanha (define as métricas exibidas). */
@Entity({ name: "campaign_presets" })
@Index(["tenantId", "metaCampaignId"], { unique: true })
export class CampaignPreset extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  metaCampaignId!: string;

  @Column({ type: "text" })
  preset!: string;
}
