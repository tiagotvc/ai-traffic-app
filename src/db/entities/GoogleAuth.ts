import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "google_auth" })
export class GoogleAuth extends AppBaseEntity {
  @Column({ type: "uuid", unique: true })
  userId!: string;

  @Column({ type: "text", nullable: true })
  accessToken?: string | null;

  @Column({ type: "text", nullable: true })
  refreshToken?: string | null;

  @Column({ type: "text", nullable: true })
  scopes?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt?: Date | null;

  /** Google Ads customer ID (fase 2). */
  @Column({ type: "text", nullable: true })
  adsCustomerId?: string | null;
}
