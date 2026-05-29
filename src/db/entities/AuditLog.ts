import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "audit_logs" })
@Index(["tenantId", "createdAt"])
export class AuditLog extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "text" })
  kind!: string; // META_APPLY | META_CREATE_CAMPAIGN | SYNC | ...

  @Column({ type: "jsonb", nullable: true })
  request?: unknown | null;

  @Column({ type: "jsonb", nullable: true })
  response?: unknown | null;

  @Column({ type: "bool", default: true })
  success!: boolean;

  @Column({ type: "text", nullable: true })
  errorMessage?: string | null;
}

