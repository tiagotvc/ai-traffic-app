import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

export type PersonaGender = "all" | "male" | "female";

/** Biblioteca global de personas (características) por gestor — sem geo, sem vínculo com ad account. */
@Entity({ name: "user_personas" })
@Index(["tenantId", "userId"])
export class UserPersona extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "int", default: 18 })
  ageMin!: number;

  @Column({ type: "int", default: 65 })
  ageMax!: number;

  @Column({ type: "text", default: "all" })
  gender!: PersonaGender;

  /** Subset Meta: flexible_spec, genders, age_min/max, locales — sem geo_locations. */
  @Column({ type: "jsonb" })
  targeting!: Record<string, unknown>;

  @Column({ type: "text", nullable: true })
  sourcePrompt!: string | null;
}
