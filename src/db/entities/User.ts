import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";

export type PlatformRole = "user" | "admin";

@Entity({ name: "users" })
export class User extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ type: "text", nullable: true })
  name?: string | null;

  @Column({ type: "text", nullable: true })
  passwordHash?: string | null;

  @Column({ type: "text", nullable: true, unique: true })
  googleId?: string | null;

  @Column({ type: "text", nullable: true, unique: true })
  facebookId?: string | null;

  @Column({ type: "text", default: "user" })
  platformRole!: PlatformRole;

  /** Aceite dos Termos de Uso / Política de Privacidade. */
  @Column({ type: "timestamptz", nullable: true })
  termsAcceptedAt?: Date | null;

  /** Versão dos termos aceita (ver LEGAL_CONTACT.termsVersion). */
  @Column({ type: "text", nullable: true })
  termsAcceptedVersion?: string | null;

  @Column({ type: "uuid" })
  tenantId!: string;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
}

