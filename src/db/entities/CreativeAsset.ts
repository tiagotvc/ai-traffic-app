import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "creative_assets" })
export class CreativeAsset extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text", nullable: true })
  metaImageHash?: string | null;

  @Column({ type: "text" })
  label!: string;
}
