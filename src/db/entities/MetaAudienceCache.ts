import { randomUUID } from "crypto";
import { BeforeInsert, Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "meta_audience_cache" })
export class MetaAudienceCache {
  @PrimaryColumn("uuid")
  id!: string;

  @BeforeInsert()
  ensureId() {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: "text", unique: true })
  metaAdAccountId!: string;

  @Column({ type: "jsonb", default: () => `'[]'` })
  audiences!: unknown[];

  @Column({ type: "timestamptz", default: () => "now()" })
  fetchedAt!: Date;
}
