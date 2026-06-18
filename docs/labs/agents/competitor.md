# Competitor Scientist

| Campo | Valor |
|-------|-------|
| **ID** | `competitor` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | `basic` |
| **Tipo** | `executável` |
| **Créditos estimados** | 10 |
| **Duração estimada** | ~3–5 min |

## Propósito

Pesquisar concorrentes e extrair padrões de anúncios, ofertas, hooks, criativos e landing pages do mercado.

## Inputs obrigatórios

- `experimentId`, `product`
- Pelo menos um de: `competitors[]`, `niche`, `market`

## Fontes

Ver [sources/meta-ad-library.md](../sources/meta-ad-library.md), [sources/landing-pages.md](../sources/landing-pages.md), [sources/tiktok-creative-center.md](../sources/tiktok-creative-center.md).

| Fonte | Dados |
|-------|-------|
| Meta Ad Library | Anúncios, tempo no ar, copy, CTA |
| TikTok Creative Center | Hooks, formatos |
| Landing pages | Oferta, garantia, preço |
| YouTube / Pinterest | Criativos públicos |
| Blogs / sites concorrentes | Posicionamento |

## Extrair (findings)

| type | Exemplo |
|------|---------|
| `hook` | "Pare de perder cabelo" |
| `offer` | Kit 3 meses + frete grátis |
| `competitor_pattern` | 82% usam antes/depois |
| `creative_pattern` | UGC vertical 9:16 |
| `pricing` | R$ 89–129 faixa dominante |

## Regra de evidência

**Anúncio rodando há muito tempo** → aumenta `evidence_count` e confiança do pattern (proxy de performance).

MVP: simular `daysRunning` em mock; produção: Meta Ad Library API/scrape.

## Dependências

Nenhuma (roda em paralelo no MVP).

## Outputs

`ScientistResult` com `findings[]`, `sourcesUsed[]`, contagens em metadata:

```json
{ "adsAnalyzed": 126, "landingsAnalyzed": 18 }
```

## Pipeline

```txt
canRun: product + (competitors OR niche)
run:
  1. Resolver lista de concorrentes
  2. Coletar ads (fontes)
  3. Gemini: estruturar hooks, ofertas, padrões
  4. saveScientistResult
```

## Eventos Inngest

- `labs/experiment.agent.started` / `completed` com `scientistId: competitor`

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/competitor-scientist/` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
