# Meta Ad Library

| Campo | Valor |
|-------|-------|
| **source_type** | `meta_ad_library` |
| **Scientists** | competitor, creative, vision |
| **Fase** | 1 |

## Dados coletados

- Copy, headline, CTA
- Tempo no ar (`days_running`) — proxy de performance
- Formato (imagem, vídeo, carrossel)
- Página de destino
- Anunciante

## Regra de evidência

`days_running` alto → aumenta peso do pattern nos findings.

## Implementação

- MVP: mock estruturado com campos realistas
- Produção: Meta Ad Library API / scrape controlado no worker

## Rate limit

Batch por concorrente; cache em `labs_market_memories` (fase 3).
