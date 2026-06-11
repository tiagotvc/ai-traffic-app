import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/** Critérios de ranqueamento dos criativos (1 por tenant). JSON em `config`. */
@Entity({ name: "ranking_config" })
@Index(["tenantId"], { unique: true })
export class RankingConfig extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  config!: string;
}
