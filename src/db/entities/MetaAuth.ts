import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./_shared";
import type { User } from "./User";

@Entity({ name: "meta_auth" })
export class MetaAuth extends AppBaseEntity {
  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne("User", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "text" })
  accessToken!: string;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt?: Date | null;

  @Column({ type: "text", nullable: true })
  tokenType?: string | null;

  @Column({ type: "text", nullable: true })
  scopes?: string | null;
}

