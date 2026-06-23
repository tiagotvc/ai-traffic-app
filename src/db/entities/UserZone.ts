import { Column, Entity, Index } from "typeorm";

import { AppBaseEntity } from "./_shared";

export type ZoneGeoRules = {
  countries?: string[];
  cities?: { key: string; radius?: number; distanceUnit?: "kilometer" | "mile" }[];
  customLocations?: {
    latitude: number;
    longitude: number;
    radius: number;
    distanceUnit: "kilometer" | "mile";
    label?: string;
  }[];
};

/** Biblioteca global de zonas (geolocalização) por gestor — sem vínculo com ad account. */
@Entity({ name: "user_zones" })
@Index(["tenantId", "userId"])
export class UserZone extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "jsonb" })
  geoRules!: ZoneGeoRules;

  @Column({ type: "text", nullable: true })
  sourcePrompt!: string | null;
}
