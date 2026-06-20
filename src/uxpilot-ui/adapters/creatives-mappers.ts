import { formatMetricValue, type MetricKey } from "@/lib/dashboard-metrics";
import { bestCreativePreviewUrl } from "@/lib/creative-preview-url";
import { formatBRL, formatNumber, formatPercent, formatRoas } from "@/lib/format";
import type { CreativeItem } from "@/components/creatives/CreativeCardGrid";

export type UxCreativeCard = {
  id: string;
  rank: number;
  title: string;
  type: "Video" | "Imagem" | "Carrossel";
  campaignType: string;
  campaignsUsed: number;
  status: "Ativo" | "Pausado" | "Encerrado";
  img_url: string | null;
  score: number;
  metrics: {
    roas: string;
    ctr: string;
    cpl: string;
    cpm: string;
    impressoes: string;
    investido: string;
  };
  raw: CreativeItem;
};

type RankGroup = {
  preset: string;
  primaryMetric: MetricKey;
  best: CreativeItem[];
  promising: CreativeItem[];
};

function mapType(type?: string): UxCreativeCard["type"] {
  const t = (type ?? "").toLowerCase();
  if (t.includes("video")) return "Video";
  if (t.includes("carousel") || t.includes("carrossel")) return "Carrossel";
  return "Imagem";
}

function mapStatus(status: string): UxCreativeCard["status"] {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Ativo";
  if (s === "PAUSED") return "Pausado";
  return "Encerrado";
}

function formatMetric(key: MetricKey, value: number | undefined, locale: string) {
  if (value == null || Number.isNaN(value)) return "—";
  if (key === "roas") return formatRoas(value, locale);
  if (key === "ctr") return formatPercent(value, 1, locale);
  if (key === "spend") return formatBRL(value, locale);
  if (key === "cpm" || key === "cpc" || key === "cpa" || key === "cpmsg") {
    return formatBRL(value, locale);
  }
  if (key === "impressions") return formatNumber(value, locale);
  return formatMetricValue(key, value, locale);
}

function scoreForRank(rank: number, total: number) {
  if (total <= 1) return 95;
  return Math.max(35, Math.round(100 - ((rank - 1) / (total - 1)) * 55));
}

export function flattenRankingGroups(
  groups: RankGroup[],
  locale: string,
  presetLabel: (preset: string) => string
): UxCreativeCard[] {
  const cards: UxCreativeCard[] = [];
  let rank = 1;

  for (const group of groups) {
    const pool = [...group.best, ...group.promising];
    const total = pool.length;
    for (const creative of pool) {
      const m = creative.metrics;
      cards.push({
        id: creative.adId ?? creative.creativeId ?? `${creative.name}-${rank}`,
        rank,
        title: creative.name,
        type: mapType(creative.type),
        campaignType: presetLabel(group.preset),
        campaignsUsed: creative.campaigns?.length ?? creative.adsCount ?? 0,
        status: mapStatus(creative.status),
        img_url: bestCreativePreviewUrl(creative.imageUrl, creative.thumbnailUrl),
        score: scoreForRank(rank, total),
        metrics: {
          roas: formatMetric("roas", m.roas, locale),
          ctr: formatMetric("ctr", m.ctr, locale),
          cpl: formatMetric("cpa", m.cpa ?? m.cpmsg, locale),
          cpm: formatMetric("cpm", m.cpm, locale),
          impressoes: formatMetric("impressions", m.impressions, locale),
          investido: formatMetric("spend", m.spend, locale)
        },
        raw: creative
      });
      rank++;
    }
  }

  return cards;
}

export function presetTabsFromGroups(groups: RankGroup[], presetLabel: (preset: string) => string) {
  const tabs = ["Todos"];
  for (const g of groups) {
    const label = presetLabel(g.preset);
    if (!tabs.includes(label)) tabs.push(label);
  }
  return tabs;
}
