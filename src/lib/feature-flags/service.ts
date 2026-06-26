import "server-only";

import { repositories } from "@/db/repositories";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

import { featureIdSet, isFeatureEnabled } from "./registry";
import type { FeatureFlagMap } from "./types";

/** Chave na tabela `platform_settings`. */
const PLATFORM_SETTING_KEY = "platform_feature_flags";
/** Chave de cache no Redis. */
const CACHE_KEY = "platform:feature_flags";
const CACHE_TTL_SEC = 60;

/** Erro lançado quando uma feature desligada é acessada (APIs). */
export class FeatureDisabledError extends Error {
  constructor(public readonly featureId: string) {
    super(`feature_disabled:${featureId}`);
    this.name = "FeatureDisabledError";
  }
}

function sanitize(raw: unknown): FeatureFlagMap {
  if (!raw || typeof raw !== "object") return {};
  const valid = featureIdSet();
  const out: FeatureFlagMap = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    // Só persistimos overlays OFF de ids conhecidos (default é ON).
    if (typeof v === "boolean" && valid.has(id)) out[id] = v;
  }
  return out;
}

async function readSetting(): Promise<unknown> {
  const { platformSetting: repo } = await repositories();
  const row = await repo.findOne({ where: { key: PLATFORM_SETTING_KEY } });
  return row?.value ?? null;
}

async function writeSetting(value: FeatureFlagMap): Promise<void> {
  const { platformSetting: repo } = await repositories();
  let row = await repo.findOne({ where: { key: PLATFORM_SETTING_KEY } });
  if (!row) {
    row = repo.create({ key: PLATFORM_SETTING_KEY, value });
  } else {
    row.value = value;
  }
  await repo.save(row);
}

/** Mapa de overrides de plataforma (ausente = ON). */
export async function getPlatformFeatureFlags(): Promise<FeatureFlagMap> {
  const cached = await redisGetJson<FeatureFlagMap>(CACHE_KEY);
  if (cached) return cached;

  const flags = sanitize(await readSetting());
  await redisSetJson(CACHE_KEY, flags, CACHE_TTL_SEC);
  return flags;
}

/** Atualiza overrides (merge) e invalida o cache. Mantém só `false` explícitos. */
export async function updatePlatformFeatureFlags(
  patch: FeatureFlagMap
): Promise<FeatureFlagMap> {
  const current = await getPlatformFeatureFlags();
  const merged: FeatureFlagMap = { ...current };
  const valid = featureIdSet();
  for (const [id, v] of Object.entries(patch)) {
    if (!valid.has(id) || typeof v !== "boolean") continue;
    if (v === false) merged[id] = false;
    else delete merged[id]; // ON = remove o override (volta ao default)
  }
  await writeSetting(merged);
  await redisSetJson(CACHE_KEY, merged, CACHE_TTL_SEC);
  return merged;
}

/** Conveniência: lê os flags e resolve uma feature (cascata + dependsOn). */
export async function isPlatformFeatureEnabled(id: string): Promise<boolean> {
  const flags = await getPlatformFeatureFlags();
  return isFeatureEnabled(flags, id);
}

/** Lança `FeatureDisabledError` se a feature estiver desligada (usar em APIs). */
export async function assertFeatureEnabled(id: string): Promise<void> {
  if (!(await isPlatformFeatureEnabled(id))) {
    throw new FeatureDisabledError(id);
  }
}
