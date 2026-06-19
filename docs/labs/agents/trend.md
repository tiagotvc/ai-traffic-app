# Trend Scientist

| Campo | Valor |
|-------|-------|
| **ID** | `trend` |
| **Status** | `planned` |
| **Fase** | 1 |
| **Tier** | `basic` |
| **Tipo** | `executável` |
| **Créditos estimados** | 8 |
| **Duração estimada** | ~2–4 min |

## Propósito

Detectar tendências atuais: sazonalidade, temas emergentes, crescimento de busca e assuntos quentes no nicho.

## Inputs obrigatórios

- `experimentId`, `product`
- `country` ou `market` (ex.: BR)

## Fontes

Ver [sources/google-trends.md](../sources/google-trends.md).

| Fonte | Dados |
|-------|-------|
| Google Trends | Volume, sazonalidade, queries relacionadas |
| TikTok Creative Center | Formatos em alta |
| YouTube Shorts / Instagram | Temas virais |
| X/Twitter, notícias | Eventos de mercado |
| Pinterest Trends | Visual trends |

## Extrair (findings)

| type | Exemplo |
|------|---------|
| `trend` | Creator Ads +31% share em 6 meses |
| `opportunity` | Busca "minoxidil feminino" +40% YoY |
| `risk` | Sazonalidade baixa em fevereiro |

## Diferença vs Momentum Scientist

Trend = **o que** está em alta agora. Momentum (fase 3) = **velocidade** de aceleração.

## Dependências

Nenhuma (paralelo no MVP).

## Outputs

Findings com séries temporais em `metadata` quando disponível.

## Pipeline

```txt
canRun: product + country/market
run:
  1. Google Trends + social signals
  2. Gemini: resumir tendências acionáveis
  3. saveScientistResult
```

## Paths de código

| Repo | Path |
|------|------|
| scientists-worker | `src/scientists/trend-scientist/` |

## Changelog

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-06-11 | — | Documentação Fase 0 |
