import { repositories } from "@/db/repositories";
import {
  DEFAULT_RANK_CONFIG,
  RANKABLE_METRICS,
  RANKABLE_PRESETS,
  type RankConfig,
  type RankSpec
} from "@/lib/creative-ranking";
import type { MetricKey } from "@/lib/dashboard-metrics";

const METRIC_SET = new Set<string>(RANKABLE_METRICS);

function sanitizeSpec(raw: unknown, fallback: RankSpec): RankSpec {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as { metric?: unknown; dir?: unknown };
  const metric = typeof r.metric === "string" && METRIC_SET.has(r.metric) ? (r.metric as MetricKey) : fallback.metric;
  const dir = r.dir === "asc" || r.dir === "desc" ? r.dir : fallback.dir;
  return { metric, dir };
}

export function sanitizeRankConfig(raw: unknown): RankConfig {
  const r = (raw ?? {}) as { minImpressions?: unknown; specs?: unknown };
  const minRaw = Number(r.minImpressions);
  const minImpressions = Number.isFinite(minRaw) && minRaw >= 0 ? Math.floor(minRaw) : DEFAULT_RANK_CONFIG.minImpressions;
  const specsRaw = (r.specs ?? {}) as Record<string, unknown>;
  const specs: Record<string, RankSpec> = {};
  for (const preset of RANKABLE_PRESETS) {
    specs[preset] = sanitizeSpec(specsRaw[preset], DEFAULT_RANK_CONFIG.specs[preset]);
  }
  return { minImpressions, specs };
}

export async function loadRankConfig(tenantId: string): Promise<RankConfig> {
  try {
    const { rankingConfig } = await repositories();
    const row = await rankingConfig.findOne({ where: { tenantId } });
    if (!row) return DEFAULT_RANK_CONFIG;
    return sanitizeRankConfig(JSON.parse(row.config));
  } catch {
    return DEFAULT_RANK_CONFIG;
  }
}

export async function saveRankConfig(tenantId: string, raw: unknown): Promise<RankConfig> {
  const clean = sanitizeRankConfig(raw);
  const { rankingConfig } = await repositories();
  let row = await rankingConfig.findOne({ where: { tenantId } });
  if (!row) {
    row = rankingConfig.create({ tenantId, config: JSON.stringify(clean) });
  } else {
    row.config = JSON.stringify(clean);
  }
  await rankingConfig.save(row);
  return clean;
}
