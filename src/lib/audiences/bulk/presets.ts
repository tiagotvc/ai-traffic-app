import { parseVideoViewAudienceName } from "./naming";
import {
  VIDEO_VIEW_PERCENTS,
  VIDEO_VIEW_RETENTION_DAYS,
  type BulkLookalikeCountry,
  type BulkLookalikeRatio,
  type VideoViewCell,
  type VideoViewPercent,
  type VideoViewRetentionDays
} from "./types";

/**
 * Presets do Criador de públicos em lote. São dados, não código de tela:
 * novos presets (inclusive os da estrutura de públicos da agência) entram
 * aqui ou, no futuro, vindos do banco com o mesmo formato.
 */

export type VideoViewPreset = {
  id: string;
  tab: "video_view";
  labelKey: string;
  cells: VideoViewCell[];
};

export type LookalikePreset = {
  id: string;
  tab: "lookalike";
  labelKey: string;
  /** Quais públicos de View Vídeo servem de base (lidos pelo nome). */
  seedOrigins: Array<{ percent: VideoViewPercent; retentionDays: VideoViewRetentionDays }>;
  ratios: BulkLookalikeRatio[];
  country: BulkLookalikeCountry;
};

export type BulkAudiencePreset = VideoViewPreset | LookalikePreset;

function fullGrid(): VideoViewCell[] {
  return VIDEO_VIEW_PERCENTS.flatMap((percent) =>
    VIDEO_VIEW_RETENTION_DAYS.map((retentionDays) => ({ percent, retentionDays }))
  );
}

export const VIDEO_VIEW_PRESETS: VideoViewPreset[] = [
  {
    id: "video_view_default",
    tab: "video_view",
    labelKey: "presets.videoViewDefault",
    cells: fullGrid()
  }
];

export const LOOKALIKE_PRESETS: LookalikePreset[] = [
  {
    id: "lookalike_video_view",
    tab: "lookalike",
    labelKey: "presets.lookalikeVideoView",
    seedOrigins: [
      { percent: 50, retentionDays: 90 },
      { percent: 75, retentionDays: 180 },
      { percent: 95, retentionDays: 365 }
    ],
    ratios: [1, 2, 3],
    country: "BR"
  }
];

/** Seeds da conta que casam com as origens do preset de Lookalike. */
export function matchLookalikePresetSeeds(
  preset: LookalikePreset,
  audiences: Array<{ id: string; name: string }>
): string[] {
  return audiences
    .filter((a) => {
      const parsed = parseVideoViewAudienceName(a.name);
      return (
        !!parsed &&
        preset.seedOrigins.some(
          (o) => o.percent === parsed.percent && o.retentionDays === parsed.retentionDays
        )
      );
    })
    .map((a) => a.id);
}
