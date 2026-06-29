import "server-only";

import { getAppShellContext } from "@/lib/app-shell-context";
import { repositories } from "@/db/repositories";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

import {
  featureIdSet,
  isFeatureEnabledForUser,
  normalizeFlagEntry
} from "./registry";
import type {
  FeatureFlagConfigMap,
  FeatureFlagContext,
  FeatureFlagEntry,
  FeatureRolloutMode
} from "./types";

/** Chave na tabela `platform_settings`. */
const PLATFORM_SETTING_KEY = "platform_feature_flags";
/** Chave de cache no Redis. */
const CACHE_KEY = "platform:feature_flags";
const CACHE_TTL_SEC = 60;

const VALID_MODES = new Set<FeatureRolloutMode>([
  "off",
  "admin_only",
  "global",
  "specific_users"
]);

/** Erro lançado quando uma feature desligada é acessada (APIs). */
export class FeatureDisabledError extends Error {
  constructor(public readonly featureId: string) {
    super(`feature_disabled:${featureId}`);
    this.name = "FeatureDisabledError";
  }
}

function sanitizeEntry(raw: unknown): FeatureFlagEntry | null {
  const normalized = normalizeFlagEntry(raw);
  if (!normalized || !VALID_MODES.has(normalized.mode)) return null;
  if (normalized.mode === "specific_users") {
    const ids = (normalized.allowedUserIds ?? []).filter((id) => typeof id === "string" && id.length > 0);
    return { mode: normalized.mode, allowedUserIds: ids };
  }
  return { mode: normalized.mode };
}

function sanitize(raw: unknown): FeatureFlagConfigMap {
  if (!raw || typeof raw !== "object") return {};
  const valid = featureIdSet();
  const out: FeatureFlagConfigMap = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!valid.has(id)) continue;
    const entry = sanitizeEntry(v);
    if (entry) out[id] = entry;
  }
  return out;
}

async function readSetting(): Promise<unknown> {
  const { platformSetting: repo } = await repositories();
  const row = await repo.findOne({ where: { key: PLATFORM_SETTING_KEY } });
  return row?.value ?? null;
}

async function writeSetting(value: FeatureFlagConfigMap): Promise<void> {
  const { platformSetting: repo } = await repositories();
  let row = await repo.findOne({ where: { key: PLATFORM_SETTING_KEY } });
  if (!row) {
    row = repo.create({ key: PLATFORM_SETTING_KEY, value });
  } else {
    row.value = value;
  }
  await repo.save(row);
}

/** Mapa de overrides de plataforma (ausente por id = herdar / default global). */
export async function getPlatformFeatureFlags(): Promise<FeatureFlagConfigMap> {
  const cached = await redisGetJson<FeatureFlagConfigMap>(CACHE_KEY);
  if (cached) return cached;

  const flags = sanitize(await readSetting());
  await redisSetJson(CACHE_KEY, flags, CACHE_TTL_SEC);
  return flags;
}

/**
 * Atualiza overrides (merge) e invalida o cache.
 * `mode: global` remove o override (volta ao default).
 */
export async function updatePlatformFeatureFlags(
  patch: FeatureFlagConfigMap
): Promise<FeatureFlagConfigMap> {
  const current = await getPlatformFeatureFlags();
  const merged: FeatureFlagConfigMap = { ...current };
  const valid = featureIdSet();

  for (const [id, v] of Object.entries(patch)) {
    if (!valid.has(id)) continue;
    const entry = sanitizeEntry(v);
    if (!entry) continue;
    if (entry.mode === "global") delete merged[id];
    else merged[id] = entry;
  }

  await writeSetting(merged);
  await redisSetJson(CACHE_KEY, merged, CACHE_TTL_SEC);
  return merged;
}

async function resolveRequestContext(): Promise<FeatureFlagContext | null> {
  try {
    const { user, platformAdmin } = await getAppShellContext();
    return { userId: user.id, isPlatformAdmin: platformAdmin };
  } catch {
    return null;
  }
}

/** Conveniência: lê os flags e resolve uma feature para o usuário da requisição (ou anônimo). */
export async function isPlatformFeatureEnabled(
  id: string,
  ctx?: FeatureFlagContext
): Promise<boolean> {
  const flags = await getPlatformFeatureFlags();
  const resolved = ctx ?? (await resolveRequestContext());
  if (!resolved) {
    return isFeatureEnabledForUser(flags, id, { userId: "", isPlatformAdmin: false });
  }
  return isFeatureEnabledForUser(flags, id, resolved);
}

/** Lança `FeatureDisabledError` se a feature estiver desligada para o usuário da requisição. */
export async function assertFeatureEnabled(
  id: string,
  ctx?: FeatureFlagContext
): Promise<void> {
  if (!(await isPlatformFeatureEnabled(id, ctx))) {
    throw new FeatureDisabledError(id);
  }
}
