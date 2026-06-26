# Campanhas — fontes de métricas e sincronização

Como a lista de campanhas obtém números e como o botão **Sincronizar Meta** se comporta.

## Visão geral

| Modo (`metricsSource`) | Quando | Origem |
|------------------------|--------|--------|
| **`db`** | Padrão (sem filtro de cliente nem período ativado pelo usuário) | Snapshots gravados no banco pela última sync |
| **`live-cached`** | Cliente ou período selecionado | API Meta + cache Redis (~3 min, `META_INSIGHTS_CACHE_TTL_SEC`, default 180s) |
| **`live`** | Mesmo gatilho que cached, sem hit de cache | API Meta em tempo real |

Lógica de gatilho: [`shouldCampaignListFetchLive`](../../src/lib/campaign-list-live.ts).

Implementação da lista: [`src/app/api/campaigns/list/route.ts`](../../src/app/api/campaigns/list/route.ts).

## Sincronização manual (botão «Sincronizar Meta»)

- Endpoint: `POST /api/sync/run`
- **Cooldown:** 3 minutos entre syncs manuais por tenant ([`MANUAL_COOLDOWN_MS`](../../src/lib/sync-queue.ts))
- Resposta `429` com `errorCode: "sync_cooldown"` e `retryAfterSec`
- Status: `GET /api/sync/status` → `manualSyncCooldown.retryAfterSec`

O componente [`MetaSyncButton`](../../src/components/layout/MetaSyncButton.tsx) usa [`useManualSyncCooldown`](../../src/hooks/useManualSyncCooldown.ts) para:

- Desabilitar o botão durante o sync e durante o cooldown
- Mostrar tooltip com tempo restante (`sync.cooldownHint`)

## Sync automático

- Login: [`AutoSyncOnLogin`](../../src/components/AutoSyncOnLogin.tsx) dispara sync em background (uma vez por sessão)
- Planos pagos podem ter sync agendado (`allowAutoSync` nos entitlements)
- Por cliente: `syncEnabled` em `client_meta_settings`

## UI — faixa informativa

[`CampaignMetricsDataBanner`](../../src/components/campaign/CampaignMetricsDataBanner.tsx) mostra uma linha curta e **data/hora da última atualização** à direita (`dataUpdatedAt` da API).

- **Banco:** última sync manual, fim do último run ou última conta sincronizada
- **Meta ao vivo/cache:** timestamp do cache ou horário da consulta

## Paginação por grupo

Cada tipo de campanha exibe no máximo **10** linhas (`CAMPAIGN_GROUP_PAGE_SIZE`), com paginação no cabeçalho do grupo (`CampaignGroupPager`).

## Boas práticas para o usuário

1. Abrir a lista sem filtros → dados do banco (rápido).
2. Filtrar cliente/período → consulta Meta com cache.
3. Precisa de dados frescos no banco → **Sincronizar Meta**, no máximo a cada 3 minutos.
4. Erro de rate limit da Meta → aguardar alguns minutos antes de atualizar de novo (`enrichRateLimitHint`).
