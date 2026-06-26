import "server-only";

import { repositories } from "@/db/repositories";
import {
  DEFAULT_THEME_CONFIG,
  mergeThemeConfig,
  PLATFORM_THEME_SETTING_KEY,
  type DesignSystemThemeConfig,
  type ThemeMode,
  type ThemePalette
} from "@/lib/design-system/theme-config";
import { redisDeleteKey, redisGetJson, redisSetJson } from "@/lib/redis-cache";

const CACHE_KEY = "platform:design_system_theme_config";
const CACHE_TTL_SEC = 120;

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

export async function getDesignSystemThemeConfig(): Promise<DesignSystemThemeConfig> {
  const cached = await redisGetJson<DesignSystemThemeConfig>(CACHE_KEY);
  if (cached) return cached;

  const raw = await readSetting(PLATFORM_THEME_SETTING_KEY);
  const config = mergeThemeConfig(raw);
  await redisSetJson(CACHE_KEY, config, CACHE_TTL_SEC);
  return config;
}

export async function updateDesignSystemThemeConfig(
  patch: Partial<Record<ThemeMode, Partial<ThemePalette>>>
): Promise<DesignSystemThemeConfig> {
  const current = await getDesignSystemThemeConfig();
  const next: DesignSystemThemeConfig = {
    light: { ...current.light, ...(patch.light ?? {}) },
    dark: { ...current.dark, ...(patch.dark ?? {}) },
    updatedAt: new Date().toISOString()
  };
  const merged = mergeThemeConfig(next);
  await writeSetting(PLATFORM_THEME_SETTING_KEY, merged);
  await redisDeleteKey(CACHE_KEY);
  await redisSetJson(CACHE_KEY, merged, CACHE_TTL_SEC);
  return merged;
}

export async function resetDesignSystemThemeConfig(): Promise<DesignSystemThemeConfig> {
  const next = { ...DEFAULT_THEME_CONFIG, updatedAt: new Date().toISOString() };
  await writeSetting(PLATFORM_THEME_SETTING_KEY, next);
  await redisDeleteKey(CACHE_KEY);
  await redisSetJson(CACHE_KEY, next, CACHE_TTL_SEC);
  return next;
}

export { DEFAULT_THEME_CONFIG };
