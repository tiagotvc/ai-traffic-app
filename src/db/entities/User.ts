import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";

@Entity({ name: "users" })
export class User extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  name?: string | null;

  @Column({ type: "text", nullable: true })
  passwordHash?: string | null;

  @Column({ type: "uuid" })
  tenantId!: string;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
}

