import "server-only";

import {
  canSpendSearchApi,
  fetchAdLibraryCached,
  googleMapsFindings,
  googleSerpFindings,
  googleTrendsFindings,
  recordResearchFindings,
  recordSearchApiSpend,
  youtubeFindings,
  type ResearchFindingDraft,
  type ResearchSourceId
} from "@/lib/commander/researcher";

/**
 * Camada de adapters do Orion Research (docs/orion-research §2): cada fonte implementa
 * o MESMO contrato e devolve `ResearchFindingDraft[]` — o Cortex nunca sabe se o dado
 * veio do SearchAPI, de API oficial ou de crawler próprio. Estratégia: SearchAPI como
 * agregador inicial (já pagamos e já tem controle de orçamento/cache); fontes críticas
 * migram para API oficial depois SEM mudar nada acima desta camada.
 */

export type ResearchSourceAdapter = {
  id: ResearchSourceId;
  /** true quando a fonte consome o orçamento compartilhado do SearchAPI. */
  usesSearchApiBudget: boolean;
  search(args: { query: string; country?: string }): Promise<ResearchFindingDraft[]>;
};

const SEARCHAPI_KEY = process.env.SEARCHAPI_API_KEY?.trim();
const SEARCHAPI_BASE = "https://www.searchapi.io/api/v1/search";

async function searchApiCall(
  params: Record<string, string>
): Promise<Record<string, unknown> | null> {
  if (!SEARCHAPI_KEY) return null;
  try {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${SEARCHAPI_BASE}?${qs}`, {
      headers: { Authorization: `Bearer ${SEARCHAPI_KEY}` },
      cache: "no-store"
    });
    if (!r.ok) return null;
    return (await r.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Converte os findings dos scientists (formato de skill) no artefato genérico. */
function fromSkillFindings(
  source: ResearchSourceId,
  category: ResearchFindingDraft["category"],
  entity: string,
  findings: Array<{ title: string; body: string }>
): ResearchFindingDraft[] {
  return findings.map((f) => ({
    source,
    category,
    entity,
    title: f.title,
    summary: f.body
  }));
}

const googleSerpAdapter: ResearchSourceAdapter = {
  id: "google_serp",
  usesSearchApiBudget: true,
  search: async ({ query, country }) =>
    fromSkillFindings(
      "google_serp",
      "audience",
      query,
      await googleSerpFindings(query, country ?? "BR")
    )
};

const googleTrendsAdapter: ResearchSourceAdapter = {
  id: "google_trends",
  usesSearchApiBudget: true,
  search: async ({ query, country }) =>
    fromSkillFindings(
      "google_trends",
      "trend",
      query,
      await googleTrendsFindings(query, country ?? "BR")
    )
};

const youtubeAdapter: ResearchSourceAdapter = {
  id: "youtube",
  usesSearchApiBudget: true,
  search: async ({ query, country }) =>
    fromSkillFindings(
      "youtube",
      "creative",
      query,
      await youtubeFindings(query, country ?? "BR")
    )
};

const googleMapsAdapter: ResearchSourceAdapter = {
  id: "google_maps",
  usesSearchApiBudget: true,
  search: async ({ query }) =>
    fromSkillFindings("google_maps", "competitor", query, await googleMapsFindings(query, null))
};

/** Google News via SearchAPI (engine `google_news`) — mudanças de mercado e novidades. */
const newsAdapter: ResearchSourceAdapter = {
  id: "news",
  usesSearchApiBudget: true,
  search: async ({ query, country }) => {
    const j = await searchApiCall({
      engine: "google_news",
      q: query,
      gl: (country ?? "BR").toLowerCase(),
      hl: "pt-br"
    });
    if (!j) return [];
    const items = ((j.organic_results ?? j.news_results ?? []) as Array<{
      title?: string;
      snippet?: string;
      source?: string | { name?: string };
      link?: string;
      date?: string;
    }>).slice(0, 6);
    return items
      .filter((n) => n.title)
      .map((n) => ({
        source: "news" as const,
        category: "news" as const,
        entity: query,
        title: n.title ?? null,
        summary: [
          n.snippet ?? n.title ?? "",
          typeof n.source === "string" ? n.source : n.source?.name,
          n.date
        ]
          .filter(Boolean)
          .join(" — "),
        evidence: { link: n.link ?? null }
      }));
  }
};

/** Mercado Livre — API pública de busca (sem chave): produtos em alta no nicho (BR). */
const mercadoLivreAdapter: ResearchSourceAdapter = {
  id: "mercado_livre",
  usesSearchApiBudget: false,
  search: async ({ query }) => {
    try {
      const r = await fetch(
        `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=8`,
        { cache: "no-store" }
      );
      if (!r.ok) return [];
      const j = (await r.json()) as {
        results?: Array<{ title?: string; price?: number; sold_quantity?: number; permalink?: string }>;
      };
      const items = (j.results ?? []).filter((p) => p.title).slice(0, 8);
      if (!items.length) return [];
      const top = [...items].sort((a, b) => (b.sold_quantity ?? 0) - (a.sold_quantity ?? 0));
      return [
        {
          source: "mercado_livre",
          category: "product",
          entity: query,
          title: `Produtos no Mercado Livre (${items.length})`,
          summary: top
            .slice(0, 5)
            .map(
              (p) =>
                `${(p.title ?? "").slice(0, 60)} — R$ ${p.price ?? "?"}${
                  p.sold_quantity ? ` (${p.sold_quantity} vendidos)` : ""
                }`
            )
            .join(" · "),
          evidence: { links: top.slice(0, 5).map((p) => p.permalink).filter(Boolean) }
        }
      ];
    } catch {
      return [];
    }
  }
};

/** Meta Ad Library — anúncios de concorrentes (reusa cache + orçamento existentes). */
const metaAdLibraryAdapter: ResearchSourceAdapter = {
  id: "meta_ad_library",
  usesSearchApiBudget: false, // orçamento próprio dentro do fetchAdLibraryCached
  search: async ({ query, country }) => {
    const result = await fetchAdLibraryCached({
      competitors: [],
      searchTerms: [query],
      marketCountry: country ?? "BR",
      maxAdsPerQuery: 20,
      cacheNiche: query
    });
    const ads = result.ads ?? [];
    if (!ads.length) return [];
    const ranked = [...ads].sort((a, b) => b.daysRunning - a.daysRunning).slice(0, 6);
    return [
      {
        source: "meta_ad_library",
        category: "competitor",
        entity: query,
        title: `Anúncios ativos no nicho (${ads.length})`,
        summary: ranked
          .map((a) => `${a.pageName}: "${(a.headline || a.body).slice(0, 60)}" [${a.daysRunning}d no ar]`)
          .join(" · "),
        confidence: Math.min(90, 40 + ads.length * 2),
        evidence: { totalAds: ads.length, topAdvertisers: ranked.map((a) => a.pageName) }
      }
    ];
  }
};

const ADAPTERS: Record<string, ResearchSourceAdapter> = Object.fromEntries(
  [
    metaAdLibraryAdapter,
    googleSerpAdapter,
    googleTrendsAdapter,
    youtubeAdapter,
    googleMapsAdapter,
    newsAdapter,
    mercadoLivreAdapter
  ].map((a) => [a.id, a])
);

export function availableResearchSources(): ResearchSourceId[] {
  return Object.keys(ADAPTERS) as ResearchSourceId[];
}

/**
 * Executa UMA fonte para uma query, respeitando o orçamento do SearchAPI quando a fonte
 * o consome, e persiste os achados em `research_findings`. É o bloco de construção dos
 * Research Jobs (agendados) e do botão "Investigar causa".
 */
export async function runResearchSource(args: {
  tenantId: string;
  clientId?: string | null;
  source: ResearchSourceId;
  query: string;
  country?: string;
  researchJobId?: string | null;
}): Promise<{ ran: boolean; findings: ResearchFindingDraft[]; reason?: string }> {
  const adapter = ADAPTERS[args.source];
  if (!adapter) return { ran: false, findings: [], reason: "source_not_available" };

  if (adapter.usesSearchApiBudget) {
    if (!(await canSpendSearchApi())) {
      return { ran: false, findings: [], reason: "searchapi_budget_exhausted" };
    }
  }

  const findings = await adapter.search({ query: args.query, country: args.country });

  if (adapter.usesSearchApiBudget) await recordSearchApiSpend();

  const withJob = args.researchJobId
    ? findings.map((f) => ({ ...f, researchJobId: args.researchJobId }))
    : findings;
  await recordResearchFindings(args.tenantId, args.clientId ?? null, withJob);

  return { ran: true, findings: withJob };
}
