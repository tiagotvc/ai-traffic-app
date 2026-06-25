import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "platform_settings" })
export class PlatformSetting {
  @PrimaryColumn({ type: "text" })
  key!: string;

  @Column({ type: "jsonb", default: {} })
  value!: unknown;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
