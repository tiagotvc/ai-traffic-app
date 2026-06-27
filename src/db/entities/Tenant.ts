import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "tenants" })
export class Tenant extends AppBaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  brandName?: string | null;

  @Column({ type: "text", nullable: true })
  logoUrl?: string | null;

  /**
   * Usuário "dono" da conexão Meta oficial do workspace. Quando definido, o token
   * dele alimenta todos os dados do workspace e logins de outros usuários NÃO
   * alteram a conexão. Null = legado (fallback ao 1º admin com token).
   */
  @Column({ type: "uuid", nullable: true })
  metaConnectionUserId?: string | null;

  @Column({ type: "text", nullable: true })
  preferredGeminiModel?: string | null;

  /** Opt-in para agregar aprendizados anonimizados por nicho (cross-tenant). */
  @Column({ type: "boolean", default: false })
  agencyBrainNicheShareOptIn!: boolean;

  @Column({ type: "text", nullable: true })
  webhookAlertUrl?: string | null;

  @Column({ type: "text", nullable: true })
  webhookReportUrl?: string | null;

  /**
   * Janela/modelo de atribuição preferida (preset; ver `meta-attribution.ts`).
   * Null = default da Meta (sem alterar comportamento). Aplicado nos relatórios
   * quando a flag `meta.attribution` estiver ligada.
   */
  @Column({ type: "text", nullable: true })
  attributionWindow?: string | null;
}

