import {
  buildLookalikeAudienceName,
  buildVideoViewAudienceName,
  normalizeAudienceName
} from "./naming";
import {
  VIDEO_VIEW_PERCENTS,
  VIDEO_VIEW_RETENTION_DAYS,
  type BulkAudienceConfig,
  type LookalikeConfig,
  type PlannedAudience,
  type PlannedAudienceWithStatus,
  type PlannedLookalikeAudience,
  type PlannedVideoViewAudience,
  type VideoViewCell,
  type VideoViewConfig
} from "./types";

/**
 * VideoViewBuilder + LookalikeBuilder: transformam a configuração da tela na
 * lista de públicos a criar. Funções puras; o servidor roda as mesmas funções
 * e é quem vale na hora de criar.
 */

/** Remove células repetidas e ordena por percentual, depois por retenção. */
export function normalizeVideoViewCells(cells: VideoViewCell[]): VideoViewCell[] {
  const seen = new Set<string>();
  const out: VideoViewCell[] = [];
  for (const c of cells) {
    const k = `${c.percent}:${c.retentionDays}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out.sort(
    (a, b) =>
      VIDEO_VIEW_PERCENTS.indexOf(a.percent) - VIDEO_VIEW_PERCENTS.indexOf(b.percent) ||
      VIDEO_VIEW_RETENTION_DAYS.indexOf(a.retentionDays) -
        VIDEO_VIEW_RETENTION_DAYS.indexOf(b.retentionDays)
  );
}

export function planVideoViewAudiences(config: VideoViewConfig): PlannedVideoViewAudience[] {
  const cells = normalizeVideoViewCells(config.cells);
  const seenVideos = new Set<string>();
  const out: PlannedVideoViewAudience[] = [];
  for (const video of config.videos) {
    if (seenVideos.has(video.id)) continue;
    seenVideos.add(video.id);
    for (const cell of cells) {
      out.push({
        kind: "video_view",
        key: `vv:${video.id}:${cell.percent}:${cell.retentionDays}`,
        name: buildVideoViewAudienceName({
          videoLabel: video.label,
          percent: cell.percent,
          retentionDays: cell.retentionDays
        }),
        videoId: video.id,
        percent: cell.percent,
        retentionDays: cell.retentionDays
      });
    }
  }
  return out;
}

/**
 * @param seedNames nome atual de cada público-base na conta. Seeds ausentes
 * do mapa são ignorados (o servidor usa isso para barrar IDs de outra conta).
 */
export function planLookalikeAudiences(
  config: LookalikeConfig,
  seedNames: ReadonlyMap<string, string>
): PlannedLookalikeAudience[] {
  const out: PlannedLookalikeAudience[] = [];
  const seenSeeds = new Set<string>();
  for (const seed of config.seeds) {
    const seedName = seedNames.get(seed.id);
    if (!seedName || seenSeeds.has(seed.id)) continue;
    seenSeeds.add(seed.id);
    const ratios = [...new Set(seed.ratios)].sort((a, b) => a - b);
    for (const ratioPercent of ratios) {
      out.push({
        kind: "lookalike",
        key: `lal:${seed.id}:${ratioPercent}:${config.country}`,
        name: buildLookalikeAudienceName({ seedName, ratioPercent, country: config.country }),
        seedId: seed.id,
        seedName,
        ratioPercent,
        country: config.country
      });
    }
  }
  return out;
}

export function planBulkAudiences(
  config: BulkAudienceConfig,
  seedNames: ReadonlyMap<string, string> = new Map()
): PlannedAudience[] {
  return config.kind === "video_view"
    ? planVideoViewAudiences(config)
    : planLookalikeAudiences(config, seedNames);
}

/**
 * Prevenção de duplicidade: marca o que já existe na conta (mesmo nome,
 * ignorando caixa/espaços) e o que se repete dentro do próprio lote.
 */
export function markDuplicates(
  plan: PlannedAudience[],
  existingNames: Iterable<string>
): PlannedAudienceWithStatus[] {
  const existing = new Set<string>();
  for (const n of existingNames) existing.add(normalizeAudienceName(n));
  const inBatch = new Set<string>();
  return plan.map((item) => {
    const key = normalizeAudienceName(item.name);
    if (existing.has(key)) return { ...item, skip: "exists" as const };
    if (inBatch.has(key)) return { ...item, skip: "batch_duplicate" as const };
    inBatch.add(key);
    return item;
  });
}

export type BulkPlanSummary = {
  total: number;
  toCreate: number;
  existing: number;
  batchDuplicates: number;
};

export function summarizePlan(plan: PlannedAudienceWithStatus[]): BulkPlanSummary {
  let existing = 0;
  let batchDuplicates = 0;
  for (const item of plan) {
    if (item.skip === "exists") existing++;
    else if (item.skip === "batch_duplicate") batchDuplicates++;
  }
  return {
    total: plan.length,
    toCreate: plan.length - existing - batchDuplicates,
    existing,
    batchDuplicates
  };
}
