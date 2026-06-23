import { describe, expect, it } from "vitest";

import type { UserPersona } from "@/db/entities/UserPersona";
import type { UserZone } from "@/db/entities/UserZone";
import {
  compilePersonaZoneTargeting,
  mergeTargetingInputs,
  personaToTargetingInput,
  zoneToTargetingInput
} from "@/lib/targeting-compiler";

function mockPersona(overrides: Partial<UserPersona> = {}): UserPersona {
  return {
    id: "p1",
    tenantId: "t1",
    userId: "u1",
    name: "Viajantes",
    description: null,
    ageMin: 35,
    ageMax: 45,
    gender: "all",
    targeting: {
      flexible_spec: [
        {
          interests: [{ id: "6002714886772", name: "International travel" }]
        }
      ]
    },
    sourcePrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as UserPersona;
}

function mockZone(overrides: Partial<UserZone> = {}): UserZone {
  return {
    id: "z1",
    tenantId: "t1",
    userId: "u1",
    name: "ZS Rio",
    description: null,
    geoRules: {
      customLocations: [
        {
          latitude: -22.9839,
          longitude: -43.2223,
          radius: 3,
          distanceUnit: "kilometer",
          label: "Leblon"
        }
      ]
    },
    sourcePrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as UserZone;
}

describe("targeting-compiler", () => {
  it("merges persona interests with zone custom_locations", () => {
    const result = compilePersonaZoneTargeting(mockPersona(), mockZone());
    expect(result.ageMin).toBe(35);
    expect(result.ageMax).toBe(45);
    expect(result.flexibleSpecs?.[0]?.interests?.[0]?.id).toBe("6002714886772");
    expect(result.customLocations?.[0]?.latitude).toBe(-22.9839);
    expect(result.customLocations?.[0]?.radius).toBe(3);
  });

  it("merges persona flexible_spec with zone cities", () => {
    const zone = mockZone({
      geoRules: {
        cities: [{ key: "2430536", radius: 10, distanceUnit: "kilometer" }]
      }
    });
    const result = compilePersonaZoneTargeting(mockPersona(), zone);
    expect(result.cities?.[0]?.key).toBe("2430536");
    expect(result.flexibleSpecs?.length).toBe(1);
  });

  it("applies gender from persona entity when targeting has no genders", () => {
    const persona = mockPersona({ gender: "female", targeting: {} });
    const result = personaToTargetingInput(persona);
    expect(result.genders).toEqual([2]);
  });

  it("zone with only countries", () => {
    const zone = mockZone({ geoRules: { countries: ["BR"] } });
    const result = zoneToTargetingInput(zone);
    expect(result.countries).toEqual(["BR"]);
    expect(result.customLocations).toBeUndefined();
  });

  it("mergeTargetingInputs combines custom audiences", () => {
    const merged = mergeTargetingInputs(
      { ageMin: 25, ageMax: 55 },
      { customAudienceIds: ["aud1", "aud2"] },
      { customAudienceIds: ["aud2", "aud3"] }
    );
    expect(merged.customAudienceIds).toEqual(["aud1", "aud2", "aud3"]);
  });

  it("defaults safe when persona has minimal targeting", () => {
    const persona = mockPersona({ ageMin: 18, ageMax: 65, targeting: {} });
    const zone = mockZone({ geoRules: {} });
    const result = compilePersonaZoneTargeting(persona, zone);
    expect(result.ageMin).toBe(18);
    expect(result.ageMax).toBe(65);
  });
});
