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
}

