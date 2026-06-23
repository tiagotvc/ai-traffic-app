import "dotenv/config";
import "reflect-metadata";

import { getDataSource } from "../src/db/data-source";
import { repositories } from "../src/db/repositories";
import type { ClientSavedTargeting } from "../src/db/entities/ClientSavedTargeting";
import type { PersonaGender } from "../src/db/entities/UserPersona";
import type { ZoneGeoRules } from "../src/db/entities/UserZone";

const dryRun = process.argv.includes("--dry-run");

function extractGeoRules(targeting: Record<string, unknown>): ZoneGeoRules | null {
  const geo = targeting.geo_locations as Record<string, unknown> | undefined;
  if (!geo) return null;

  const rules: ZoneGeoRules = {};
  if (Array.isArray(geo.countries) && geo.countries.length) {
    rules.countries = geo.countries as string[];
  }
  if (Array.isArray(geo.cities) && geo.cities.length) {
    rules.cities = (geo.cities as Array<Record<string, unknown>>).map((c) => ({
      key: String(c.key ?? ""),
      radius: typeof c.radius === "number" ? c.radius : undefined,
      distanceUnit: (c.distance_unit as "kilometer" | "mile") ?? "kilometer"
    }));
  }
  if (Array.isArray(geo.custom_locations) && geo.custom_locations.length) {
    rules.customLocations = (geo.custom_locations as Array<Record<string, unknown>>).map(
      (loc) => ({
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        radius: typeof loc.radius === "number" ? loc.radius : 5,
        distanceUnit: (loc.distance_unit as "kilometer" | "mile") ?? "kilometer",
        label: typeof loc.name === "string" ? loc.name : undefined
      })
    );
  }

  return rules.countries?.length || rules.cities?.length || rules.customLocations?.length
    ? rules
    : null;
}

function extractPersonaTargeting(targeting: Record<string, unknown>): {
  ageMin: number;
  ageMax: number;
  gender: PersonaGender;
  personaTargeting: Record<string, unknown>;
} {
  const ageMin = typeof targeting.age_min === "number" ? targeting.age_min : 18;
  const ageMax = typeof targeting.age_max === "number" ? targeting.age_max : 65;
  const genders = targeting.genders as number[] | undefined;
  let gender: PersonaGender = "all";
  if (genders?.length === 1 && genders[0] === 1) gender = "male";
  else if (genders?.length === 1 && genders[0] === 2) gender = "female";

  const personaTargeting: Record<string, unknown> = {};
  if (targeting.flexible_spec) personaTargeting.flexible_spec = targeting.flexible_spec;
  if (targeting.genders) personaTargeting.genders = targeting.genders;
  if (targeting.age_min != null) personaTargeting.age_min = targeting.age_min;
  if (targeting.age_max != null) personaTargeting.age_max = targeting.age_max;
  if (targeting.locales) personaTargeting.locales = targeting.locales;

  return { ageMin, ageMax, gender, personaTargeting };
}

async function resolveMigrationUserId(tenantId: string): Promise<string | null> {
  const { tenant: tenantRepo, tenantMember: memberRepo } = await repositories();
  const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
  if (tenant?.metaConnectionUserId) return tenant.metaConnectionUserId;

  const admin = await memberRepo.findOne({ where: { tenantId, role: "admin" } });
  return admin?.userId ?? null;
}

async function migrateRow(
  row: ClientSavedTargeting,
  userId: string
): Promise<{ personaId?: string; zoneId?: string }> {
  const targeting = row.targeting ?? {};
  const geoRules = extractGeoRules(targeting);
  const persona = extractPersonaTargeting(targeting);
  const hasPersona =
    Object.keys(persona.personaTargeting).length > 0 ||
    persona.ageMin !== 18 ||
    persona.ageMax !== 65;

  const result: { personaId?: string; zoneId?: string } = {};

  if (dryRun) {
    if (geoRules) console.log(`  [dry-run] zone from "${row.name}"`);
    if (hasPersona) console.log(`  [dry-run] persona from "${row.name}"`);
    return result;
  }

  const { userPersona, userZone, clientSavedTargeting } = await repositories();

  if (geoRules) {
    const zone = userZone.create({
      tenantId: row.tenantId,
      userId,
      name: `[Migrado] ${row.name} — Geo`,
      description: `Migrado de client_saved_targeting ${row.id}`,
      geoRules,
      sourcePrompt: null
    });
    const saved = await userZone.save(zone);
    result.zoneId = saved.id;
  }

  if (hasPersona) {
    const p = userPersona.create({
      tenantId: row.tenantId,
      userId,
      name: `[Migrado] ${row.name} — Persona`,
      description: `Migrado de client_saved_targeting ${row.id}`,
      ageMin: persona.ageMin,
      ageMax: persona.ageMax,
      gender: persona.gender,
      targeting: persona.personaTargeting,
      sourcePrompt: null
    });
    const saved = await userPersona.save(p);
    result.personaId = saved.id;
  }

  row.migratedToPersonaZoneAt = new Date();
  await clientSavedTargeting.save(row);

  return result;
}

async function main() {
  await getDataSource();
  const { clientSavedTargeting } = await repositories();

  const rows = await clientSavedTargeting.find({
    where: {},
    order: { createdAt: "ASC" }
  });

  const pending = rows.filter((r) => !r.migratedToPersonaZoneAt);
  console.log(
    `${dryRun ? "[dry-run] " : ""}Migrating ${pending.length} of ${rows.length} client_saved_targeting rows`
  );

  for (const row of pending) {
    const userId = await resolveMigrationUserId(row.tenantId);
    if (!userId) {
      console.warn(`Skip ${row.id}: no admin/meta connection user for tenant ${row.tenantId}`);
      continue;
    }
    console.log(`Processing "${row.name}" (${row.id})`);
    await migrateRow(row, userId);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
