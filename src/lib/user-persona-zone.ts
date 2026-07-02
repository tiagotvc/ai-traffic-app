import "server-only";

import { repositories } from "@/db/repositories";
import { assertLimit } from "@/lib/billing/entitlements";
import type { PersonaGender, UserPersona } from "@/db/entities/UserPersona";
import type { UserZone, ZoneGeoRules } from "@/db/entities/UserZone";

export async function listUserPersonas(args: {
  tenantId: string;
  userId: string;
}): Promise<UserPersona[]> {
  const { userPersona } = await repositories();
  return userPersona.find({
    where: { tenantId: args.tenantId, userId: args.userId },
    order: { updatedAt: "DESC" }
  });
}

export async function getUserPersona(args: {
  tenantId: string;
  userId: string;
  id: string;
}): Promise<UserPersona | null> {
  const { userPersona } = await repositories();
  return userPersona.findOne({
    where: { id: args.id, tenantId: args.tenantId, userId: args.userId }
  });
}

export async function createUserPersona(args: {
  tenantId: string;
  userId: string;
  name: string;
  description?: string | null;
  ageMin?: number;
  ageMax?: number;
  gender?: PersonaGender;
  targeting: Record<string, unknown>;
  sourcePrompt?: string | null;
}): Promise<UserPersona> {
  await assertLimit(args.tenantId, "maxAudiencePersonas");
  const { userPersona } = await repositories();
  const row = userPersona.create({
    tenantId: args.tenantId,
    userId: args.userId,
    name: args.name.trim(),
    description: args.description ?? null,
    ageMin: args.ageMin ?? 18,
    ageMax: args.ageMax ?? 65,
    gender: args.gender ?? "all",
    targeting: args.targeting,
    sourcePrompt: args.sourcePrompt ?? null
  });
  return userPersona.save(row);
}

export async function updateUserPersona(
  row: UserPersona,
  patch: Partial<
    Pick<UserPersona, "name" | "description" | "ageMin" | "ageMax" | "gender" | "targeting" | "sourcePrompt">
  >
): Promise<UserPersona> {
  const { userPersona } = await repositories();
  Object.assign(row, patch);
  return userPersona.save(row);
}

export async function deleteUserPersona(row: UserPersona): Promise<void> {
  const { userPersona } = await repositories();
  await userPersona.remove(row);
}

export async function listUserZones(args: {
  tenantId: string;
  userId: string;
}): Promise<UserZone[]> {
  const { userZone } = await repositories();
  return userZone.find({
    where: { tenantId: args.tenantId, userId: args.userId },
    order: { updatedAt: "DESC" }
  });
}

export async function getUserZone(args: {
  tenantId: string;
  userId: string;
  id: string;
}): Promise<UserZone | null> {
  const { userZone } = await repositories();
  return userZone.findOne({
    where: { id: args.id, tenantId: args.tenantId, userId: args.userId }
  });
}

export async function createUserZone(args: {
  tenantId: string;
  userId: string;
  name: string;
  description?: string | null;
  geoRules: ZoneGeoRules;
  sourcePrompt?: string | null;
}): Promise<UserZone> {
  const { userZone } = await repositories();
  const row = userZone.create({
    tenantId: args.tenantId,
    userId: args.userId,
    name: args.name.trim(),
    description: args.description ?? null,
    geoRules: args.geoRules,
    sourcePrompt: args.sourcePrompt ?? null
  });
  return userZone.save(row);
}

export async function updateUserZone(
  row: UserZone,
  patch: Partial<Pick<UserZone, "name" | "description" | "geoRules" | "sourcePrompt">>
): Promise<UserZone> {
  const { userZone } = await repositories();
  Object.assign(row, patch);
  return userZone.save(row);
}

export async function deleteUserZone(row: UserZone): Promise<void> {
  const { userZone } = await repositories();
  await userZone.remove(row);
}
