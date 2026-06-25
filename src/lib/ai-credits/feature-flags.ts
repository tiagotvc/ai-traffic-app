import "server-only";

import { repositories } from "@/db/repositories";
import { redisGetJson, redisSetJson } from "@/lib/redis-cache";

import {
  DEFAULT_AI_CREDITS_FEATURE_FLAGS,
  DEFAULT_AI_CREDIT_WEIGHTS,
  PLATFORM_SETTING_KEYS
} from "./defaults";
import type { AiCreditWeights, AiCreditsFeatureFlags } from "./types";

const FLAGS_CACHE_KEY = "platform:ai_credits_feature_flags";
const WEIGHTS_CACHE_KEY = "platform:ai_credit_weights";
const CACHE_TTL_SEC = 60;

function mergeFlags(raw: unknown): AiCreditsFeatureFlags {
  const base = { ...DEFAULT_AI_CREDITS_FEATURE_FLAGS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    creditsV2Enabled: o.creditsV2Enabled === true,
    tenantPolicyUiEnabled: o.tenantPolicyUiEnabled === true,
    perClientCapsEnabled: o.perClientCapsEnabled === true,
    agentLayerEnabled: o.agentLayerEnabled === true
  };
}

function mergeWeights(raw: unknown): AiCreditWeights {
  const base = { ...DEFAULT_AI_CREDIT_WEIGHTS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AiCreditWeights>;
  for (const key of Object.keys(base) as (keyof AiCreditWeights)[]) {
    const v = o[key];
    if (typeof v === "number" && v >= 0) base[key] = Math.round(v);
  }
  return base;
}

async function readSetting(key: string): Promise<unknown> {
  const { platformSetting: repo } = await repositories();
  const row = await repo.findOne({ where: { key } });
  return row?.value ?? null;
}

async function writeSetting(key: string, value: unknown) {
  const { platformSetting: repo } = await repositories();
  let row = await repo.findOne({ where: { key } });
  if (!row) {
    row = repo.create({ key, value });
  } else {
    row.value = value;
  }
  await repo.save(row);
}

export async function getAiCreditsFeatureFlags(): Promise<AiCreditsFeatureFlags> {
  const cached = await redisGetJson<AiCreditsFeatureFlags>(FLAGS_CACHE_KEY);
  if (cached) return cached;

  const raw = await readSetting(PLATFORM_SETTING_KEYS.featureFlags);
  const flags = mergeFlags(raw);
  await redisSetJson(FLAGS_CACHE_KEY, flags, CACHE_TTL_SEC);
  return flags;
}

export async function getAiCreditWeights(): Promise<AiCreditWeights> {
  const cached = await redisGetJson<AiCreditWeights>(WEIGHTS_CACHE_KEY);
  if (cached) return cached;

  const raw = await readSetting(PLATFORM_SETTING_KEYS.weights);
  const weights = mergeWeights(raw);
  await redisSetJson(WEIGHTS_CACHE_KEY, weights, CACHE_TTL_SEC);
  return weights;
}

export async function isAiCreditsV2Enabled(): Promise<boolean> {
  const flags = await getAiCreditsFeatureFlags();
  return flags.creditsV2Enabled;
}

export async function updateAiCreditsFeatureFlags(
  patch: Partial<AiCreditsFeatureFlags>
): Promise<AiCreditsFeatureFlags> {
  const current = await getAiCreditsFeatureFlags();
  const next: AiCreditsFeatureFlags = {
    ...current,
    ...patch
  };
  if (!next.creditsV2Enabled) {
    next.tenantPolicyUiEnabled = false;
    next.perClientCapsEnabled = false;
    next.agentLayerEnabled = false;
  }
  await writeSetting(PLATFORM_SETTING_KEYS.featureFlags, next);
  await redisSetJson(FLAGS_CACHE_KEY, next, CACHE_TTL_SEC);
  return next;
}

export async function updateAiCreditWeights(
  patch: Partial<AiCreditWeights>
): Promise<AiCreditWeights> {
  const current = await getAiCreditWeights();
  const next = mergeWeights({ ...current, ...patch });
  await writeSetting(PLATFORM_SETTING_KEYS.weights, next);
  await redisSetJson(WEIGHTS_CACHE_KEY, next, CACHE_TTL_SEC);
  return next;
}

export async function invalidateAiCreditsPlatformCache() {
  await redisSetJson(FLAGS_CACHE_KEY, null, 1);
  await redisSetJson(WEIGHTS_CACHE_KEY, null, 1);
}
