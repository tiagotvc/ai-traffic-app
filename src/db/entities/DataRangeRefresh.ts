import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Client } from "./Client";

@Entity({ name: "data_range_refreshes" })
@Index(["tenantId", "clientId", "platform"], { unique: true })
export class DataRangeRefresh extends AppBaseEntity {
  @Column({ type: "uuid" }) tenantId!: string;
  @Column({ type: "uuid" }) clientId!: string;
  @ManyToOne("Client", { onDelete: "CASCADE" }) @JoinColumn({ name: "clientId" }) client!: Client;
  @Column({ type: "text" }) platform!: "meta" | "google";
  @Column({ type: "date" }) since!: string;
  @Column({ type: "date" }) until!: string;
  @Column({ type: "timestamptz" }) refreshedAt!: Date;
}
