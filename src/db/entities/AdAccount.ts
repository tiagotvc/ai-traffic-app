import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Client } from "./Client";

@Entity({ name: "ad_accounts" })
export class AdAccount extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @ManyToOne("Client", { onDelete: "CASCADE" })
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Column({ type: "text" })
  metaAdAccountId!: string;

  @Column({ type: "text", nullable: true })
  metaBusinessId?: string | null;

  @Column({ type: "text", nullable: true })
  label?: string | null;
}

