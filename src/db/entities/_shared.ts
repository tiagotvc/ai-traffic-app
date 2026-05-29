import { randomUUID } from "crypto";
import {
  BaseEntity,
  BeforeInsert,
  Column,
  CreateDateColumn,
  PrimaryColumn,
  UpdateDateColumn
} from "typeorm";

export abstract class AppBaseEntity extends BaseEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @BeforeInsert()
  private ensureId() {
    if (!this.id) this.id = randomUUID();
  }
}

export function jsonColumn() {
  return Column({ type: "jsonb", nullable: true });
}

