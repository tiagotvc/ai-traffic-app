# Fontes de dados

Catálogo de fontes usadas pelos Scientists. Cada fonte mapeia para `labs_sources.source_type`.

## Índice

| Fonte | `source_type` | Scientists | Fase |
|-------|---------------|------------|------|
| [Meta Ad Library](./meta-ad-library.md) | `meta_ad_library` | competitor, creative | 1 |
| [TikTok Creative Center](./tiktok-creative-center.md) | `tiktok_creative_center` | competitor, trend, creative | 1 |
| [Google Trends](./google-trends.md) | `google_trends` | trend, momentum | 1 |
| [Reviews](./reviews.md) | `reviews_*` | consumer | 1 |
| [Social comments](./social-comments.md) | `social_comments` | consumer, social | 1 |
| [Landing pages](./landing-pages.md) | `landing_page` | competitor, offer | 1 |
| [Client campaigns](./client-campaigns.md) | `client_meta` | winner, failure, confidence | 2 |
| [App stores](./app-stores.md) | `app_store` | app, game, consumer | 3 |

## Princípios

1. **Citar fonte** em todo finding (`sources[]` ou FK `labs_sources`)
2. **Preferir APIs oficiais** antes de scrape (MVP pode mock)
3. **Respeitar ToS** e rate limits — jobs noturnos com backoff
4. Fontes internas (Meta do cliente) via APIs já integradas no Traffic AI — tempo real no dashboard, snapshot no Labs

## Seleção pelo usuário

Campo `selectedSources` no experimento (opcional). Se vazio, Orchestrator usa preset por Scientists selecionados.
