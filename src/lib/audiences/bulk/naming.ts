/**
 * AudienceNamingService: único lugar que sabe montar (e ler de volta) os nomes
 * dos públicos criados pelo Criador de públicos em lote.
 *
 * Para mudar o padrão de nomenclatura, altere só este arquivo: builders,
 * presets e a checagem de duplicidade dependem destas funções.
 */

export const BULK_AUDIENCE_NAME_PREFIX = "[M]";
const SEPARATOR = " - ";

function clean(part: string): string {
  return part.replace(/\s+/g, " ").trim();
}

function join(parts: string[]): string {
  return parts.map(clean).filter(Boolean).join(SEPARATOR);
}

/** `[M] - View Vídeo - ANÚNCIO 01 - 50% - 30D` */
export function buildVideoViewAudienceName(input: {
  videoLabel: string;
  percent: number;
  retentionDays: number;
}): string {
  return join([
    BULK_AUDIENCE_NAME_PREFIX,
    "View Vídeo",
    input.videoLabel,
    `${input.percent}%`,
    `${input.retentionDays}D`
  ]);
}

/**
 * `[M] - LAL - View Vídeo - ANÚNCIO 01 - 50% - 90D - 1% - BR`
 *
 * O prefixo `[M]` do público-base é removido para não duplicar
 * (`[M] - LAL - [M] - ...`).
 */
export function buildLookalikeAudienceName(input: {
  seedName: string;
  ratioPercent: number;
  country: string;
}): string {
  return join([
    BULK_AUDIENCE_NAME_PREFIX,
    "LAL",
    stripBulkPrefix(input.seedName),
    `${input.ratioPercent}%`,
    input.country.toUpperCase()
  ]);
}

export function stripBulkPrefix(name: string): string {
  const trimmed = clean(name);
  const prefix = `${BULK_AUDIENCE_NAME_PREFIX}${SEPARATOR.trimEnd()}`;
  return trimmed.startsWith(prefix) ? clean(trimmed.slice(prefix.length)) : trimmed;
}

/**
 * Lê um nome gerado por `buildVideoViewAudienceName`. Usado pelos presets de
 * Lookalike para achar os públicos-base (ex.: "50% - 90D") na conta.
 */
export function parseVideoViewAudienceName(
  name: string
): { videoLabel: string; percent: number; retentionDays: number } | null {
  const match = clean(name).match(/^\[M\] - View Vídeo - (.+) - (\d{1,3})% - (\d{1,3})D$/i);
  if (!match) return null;
  return {
    videoLabel: match[1]!,
    percent: Number(match[2]),
    retentionDays: Number(match[3])
  };
}

/** Chave de comparação para detectar público já existente com o mesmo nome. */
export function normalizeAudienceName(name: string): string {
  return clean(name).toLocaleLowerCase("pt-BR");
}
