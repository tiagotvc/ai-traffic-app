import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

/**
 * Token de acesso ao servidor MCP do Agency Brain (escopo: 1 workspace/tenant).
 * O segredo nunca é persistido em claro — guardamos só o SHA-256.
 */
@Entity({ name: "mcp_tokens" })
@Index("idx_mcp_tokens_token_hash", ["tokenHash"], { unique: true })
@Index("idx_mcp_tokens_tenant", ["tenantId"])
export class McpToken extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  /** SHA-256 hex do token (o token em claro só aparece na criação). */
  @Column({ type: "text" })
  tokenHash!: string;

  @Column({ type: "text", nullable: true })
  label?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt?: Date | null;
}
