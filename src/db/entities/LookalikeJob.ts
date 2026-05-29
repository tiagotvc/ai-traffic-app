import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "lookalike_jobs" })
export class LookalikeJob extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "pending" })
  status!: string;

  @Column({ type: "text" })
  seedType!: string;

  @Column({ type: "text", nullable: true })
  seedId?: string | null;

  @Column({ type: "numeric", precision: 5, scale: 4, default: "0.01" })
  ratio!: string;

  @Column({ type: "text", default: "BR" })
  country!: string;

  @Column({ type: "text", nullable: true })
  metaAudienceId?: string | null;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;
}
