import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";
import type { User } from "./User";

@Entity({ name: "tenant_invites" })
export class TenantInvite extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ type: "text", default: "member" })
  role!: "admin" | "member";

  @Column({ type: "text", unique: true })
  token!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ type: "uuid", nullable: true })
  invitedByUserId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  acceptedAt?: Date | null;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @ManyToOne("User", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "invitedByUserId" })
  invitedBy?: User | null;
}
