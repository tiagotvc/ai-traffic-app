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
  const videoIds = [...new Set(config.videoIds)];
  return normalizeVideoViewCells(config.cells).map((cell) => ({
    kind: "video_view",
    key: `vv:${cell.percent}:${cell.retentionDays}`,
    name: buildVideoViewAudienceName({
      videoLabel: config.label,
      percent: cell.percent,
      retentionDays: cell.retentionDays
    }),
    videoIds,
    percent: cell.percent,
    retentionDays: cell.retentionDays
  }));
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

/**
 * Chave origem + percentual + país de um lookalike, lida do `lookalike_spec`
 * da Meta. `null` quando o formato não é reconhecido.
 */
export function lookalikeSpecKey(spec: unknown): string | null {
  let obj: unknown = spec;
  if (typeof spec === "string") {
    try {
      obj = JSON.parse(spec);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const s = obj as {
    ratio?: number;
    country?: string;
    origin?: Array<{ id?: string }>;
    location_spec?: { geo_locations?: { countries?: string[] } };
  };
  const originId = s.origin?.[0]?.id;
  const country = s.country ?? s.location_spec?.geo_locations?.countries?.[0];
  if (!originId || !country || typeof s.ratio !== "number") return null;
  return `${originId}:${Math.round(s.ratio * 100)}:${country.toUpperCase()}`;
}

/**
 * A Meta recusa lookalike com mesma origem, país e tamanho mesmo com outro
 * nome (#2654). Marca esses como já existentes antes de tentar criar.
 */
export function markExistingLookalikes(
  plan: PlannedAudienceWithStatus[],
  existingSpecKeys: ReadonlySet<string>
): PlannedAudienceWithStatus[] {
  return plan.map((item) =>
    item.kind === "lookalike" &&
    !item.skip &&
    existingSpecKeys.has(`${item.seedId}:${item.ratioPercent}:${item.country.toUpperCase()}`)
      ? { ...item, skip: "exists" as const }
      : item
  );
}
