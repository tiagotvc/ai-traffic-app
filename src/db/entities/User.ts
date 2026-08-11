import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { Tenant } from "./Tenant";
import type { SignupAttributionBlob } from "@/lib/analytics/attribution";

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

  /**
   * Parâmetros de campanha que trouxeram a pessoa até o cadastro (utm, fbclid, gclid)
   * mais os cookies do Pixel (`fbp`/`fbc`) — estes últimos alimentam o `Purchase`
   * server-side, que roda no webhook sem navegador. Ver `SignupAttributionBlob`.
   */
  @Column({ type: "jsonb", nullable: true })
  signupAttribution?: SignupAttributionBlob | null;

  /**
   * Escolha no banner de cookies, congelada no cadastro. Necessária porque o
   * webhook de cobrança roda sem navegador e não teria como checar o cookie
   * antes de mandar `Purchase` pra Meta.
   */
  @Column({ type: "text", nullable: true })
  analyticsConsent?: "accepted" | "rejected" | null;

  @Column({ type: "timestamptz", nullable: true })
  analyticsConsentAt?: Date | null;

  @Column({ type: "uuid" })
  tenantId!: string;

  @ManyToOne("Tenant", { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
}

