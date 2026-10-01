import { z } from "zod";

/**
 * Contrato do Criador de públicos em lote. Isomórfico: a tela usa para montar
 * a configuração e o preview; o servidor usa para validar e é quem decide o
 * plano final (a tela nunca envia nomes prontos).
 */

export const VIDEO_VIEW_PERCENTS = [50, 75, 95] as const;
export const VIDEO_VIEW_RETENTION_DAYS = [30, 60, 90, 180, 365] as const;
export const BULK_LOOKALIKE_RATIOS = [1, 2, 3, 4, 5, 10] as const;
export const BULK_LOOKALIKE_COUNTRIES = ["BR", "US", "PT", "MX", "AR", "CO", "CL", "PE", "ES"] as const;

export type VideoViewPercent = (typeof VIDEO_VIEW_PERCENTS)[number];
export type VideoViewRetentionDays = (typeof VIDEO_VIEW_RETENTION_DAYS)[number];
export type BulkLookalikeRatio = (typeof BULK_LOOKALIKE_RATIOS)[number];
export type BulkLookalikeCountry = (typeof BULK_LOOKALIKE_COUNTRIES)[number];

/** Limite por lote: acima disso a criação vira minutos de espera e rate limit. */
export const BULK_MAX_AUDIENCES = 200;

/** Teto de segurança de vídeos numa mesma regra de público. */
export const BULK_MAX_VIDEOS_PER_AUDIENCE = 500;

const percentSchema = z.literal(VIDEO_VIEW_PERCENTS);
const retentionSchema = z.literal(VIDEO_VIEW_RETENTION_DAYS);
const ratioSchema = z.literal(BULK_LOOKALIKE_RATIOS);

export const VideoViewCellSchema = z.object({
  percent: percentSchema,
  retentionDays: retentionSchema
});
export type VideoViewCell = z.infer<typeof VideoViewCellSchema>;

export const VideoViewConfigSchema = z.object({
  kind: z.literal("video_view"),
  /**
   * Todos os vídeos entram juntos em cada público: 1 público por combinação
   * de percentual × retenção, não por vídeo.
   */
  videoIds: z.array(z.string().min(1)).min(1).max(BULK_MAX_VIDEOS_PER_AUDIENCE),
  /** Nome do grupo de vídeos que entra no nome do público (ex.: "ANÚNCIO 01"). */
  label: z.string().trim().min(1).max(80),
  cells: z.array(VideoViewCellSchema).min(1)
});
export type VideoViewConfig = z.infer<typeof VideoViewConfigSchema>;

export const LookalikeConfigSchema = z.object({
  kind: z.literal("lookalike"),
  country: z.enum(BULK_LOOKALIKE_COUNTRIES),
  seeds: z
    .array(
      z.object({
        id: z.string().min(1),
        ratios: z.array(ratioSchema).min(1)
      })
    )
    .min(1)
});
export type LookalikeConfig = z.infer<typeof LookalikeConfigSchema>;

export const BulkAudienceConfigSchema = z.discriminatedUnion("kind", [
  VideoViewConfigSchema,
  LookalikeConfigSchema
]);
export type BulkAudienceConfig = z.infer<typeof BulkAudienceConfigSchema>;

export type BulkAudienceKind = BulkAudienceConfig["kind"];

export type PlannedVideoViewAudience = {
  kind: "video_view";
  key: string;
  name: string;
  videoIds: string[];
  percent: VideoViewPercent;
  retentionDays: VideoViewRetentionDays;
};

export type PlannedLookalikeAudience = {
  kind: "lookalike";
  key: string;
  name: string;
  seedId: string;
  seedName: string;
  ratioPercent: BulkLookalikeRatio;
  country: string;
};

export type PlannedAudience = PlannedVideoViewAudience | PlannedLookalikeAudience;

/**
 * `exists`: já há um público com esse nome na conta.
 * `batch_duplicate`: duas combinações do próprio lote geram o mesmo nome
 * (ex.: dois vídeos com o mesmo apelido); só a primeira é criada.
 */
export type PlannedAudienceSkipReason = "exists" | "batch_duplicate";

export type PlannedAudienceWithStatus = PlannedAudience & {
  skip?: PlannedAudienceSkipReason;
};

export type BulkAudienceItemResult =
  | { key: string; name: string; status: "created"; audienceId: string }
  | { key: string; name: string; status: "skipped"; reason: PlannedAudienceSkipReason }
  | { key: string; name: string; status: "error"; error: string };

/** Itens por requisição de criação: cabe no maxDuration da rota com folga. */
export const BULK_CREATE_CHUNK_SIZE = 5;
