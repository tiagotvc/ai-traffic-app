# Meta — CAPI & Atribuição

> Integrações server-side com a Meta: **Conversions API (CAPI, P0)** e **janelas de atribuição (P2)**
> do [plano vs. RedTrack](../cerebro-da-agencia/plano-acao-vs-redtrack.md). Ambas atrás de flags
> (`meta.capi`, `meta.attribution`). Fonte de verdade desta feature.

## CAPI (Conversions API) — P0

Envio **server-to-server** de eventos de conversão para o pixel do cliente
(`POST /{pixel-id}/events`), recuperando sinal perdido por iOS/ad blockers.

| Peça | Arquivo | Papel |
|---|---|---|
| Hash de PII | [`src/lib/meta-capi-hash.ts`](../../src/lib/meta-capi-hash.ts) | SHA-256 de email/telefone/etc. (exigência da Meta). |
| Cliente CAPI | [`src/lib/meta-capi.ts`](../../src/lib/meta-capi.ts) | `sendConversionEvent({pixelId, accessToken, event, testEventCode?})` + dedupe via `event_id`. |
| Serviço | [`src/lib/meta-capi-service.ts`](../../src/lib/meta-capi-service.ts) | `sendClientConversion` — resolve pixel do cliente + gate `meta.capi`. |
| Endpoint de teste | [`/api/meta/capi/test`](../../src/app/api/meta/capi/test/route.ts) | Dispara evento com `test_event_code` (admin) → valida no Events Manager. |
| **Envio em produção (P0.3)** | [`/api/meta/capi`](../../src/app/api/meta/capi/route.ts) | POST com `{clientId, eventName, userData, customData, eventId?...}` → hasheia + envia + loga. |
| **Log + observabilidade (P0.4)** | [`CapiEventLog`](../../src/db/entities/CapiEventLog.ts) (migração `0055`) + `getCapiStatus` | Toda chamada grava sucesso/erro/eventsReceived. |
| **Status (P0.4)** | [`/api/meta/capi/status?clientId=`](../../src/app/api/meta/capi/status/route.ts) | Enviados 24h, último erro e últimos 10 eventos. |

- **Fonte do pixel**: `client_meta_settings.metaPixelId` ou o 1º de `linkedMetaPixelIds` (vinculados
  ao cliente — base adicionada na migração `0052`).
- **Token**: `resolveWorkspaceMetaAccessToken(tenantId, userId)`.
- **Dedupe (P0.2)**: passe o mesmo `event_id` no pixel do navegador e na CAPI.
- **Expectativa honesta**: match real ~10–45% do sinal perdido (não "100%").

**Critério de pronto (P0):** `POST /api/meta/capi/test {clientId, testEventCode}` → o evento aparece
em **Events Manager → Test Events** com `event_id` (dedupe) e PII hasheada. ✅

**Feito (P0.3/P0.4):** envio em produção (`/api/meta/capi`), **log de eventos** (`CapiEventLog`) e
**status** (`/api/meta/capi/status`: enviados 24h, último erro). **Pendente:** UI/painel por cliente
(toggle on/off + visualização do status) — back-end pronto, falta o componente; e o ingest público
por-cliente (site do cliente → nosso endpoint com token), se quiserem expor para fora.

## Atribuição — P2 (fundação)

Preferência de **janela/modelo de atribuição** por workspace, aplicável aos relatórios.

| Peça | Arquivo |
|---|---|
| Presets + resolver | [`src/lib/meta-attribution.ts`](../../src/lib/meta-attribution.ts) (`ATTRIBUTION_PRESETS`, `resolveAttributionWindows`) |
| Preferência por tenant | [`src/lib/tenant-attribution.ts`](../../src/lib/tenant-attribution.ts) + coluna `tenants.attributionWindow` (migração `0054`) |
| API | [`/api/meta/attribution`](../../src/app/api/meta/attribution/route.ts) (GET/PUT, admin, gate `meta.attribution`) |

Presets: `default` (= comportamento atual da Meta), `1d_view`, `1d_click`, `7d_click`,
`7d_click_1d_view`, `28d_click_1d_view`.

**Preview isolado (read-only)** — [`/api/meta/attribution/preview`](../../src/app/api/meta/attribution/preview/route.ts):
busca insights **ao vivo** com a janela escolhida e devolve spend/conversões/CPA agregados, **sem
gravar nada e sem tocar nos snapshots/ranking**. É o "e se eu usasse a janela X?".

> **Decisão de segurança (importante):** a conversão exibida em dashboards/ranking/relatórios vem do
> **sync → snapshots** (`fetchAccountInsightsDaily` no `sync-meta`), que alimenta **também o ranking**.
> Aplicar `action_attribution_windows` ali mudaria o **ranking** — que **não devo tocar**. Por isso a
> atribuição foi entregue como **preview isolado** (live, read-only) e o param em
> `fetchAccountInsightsDaily` é **opcional, default off** (o sync não passa nada → zero mudança).
> Trocar a janela *padrão* dos relatórios exigiria re-sincronizar snapshots por janela — decisão de
> produto que afeta ranking; fora de escopo por ora.

## Flags
- `meta.capi` — liga a Conversions API.
- `meta.attribution` — liga a preferência de atribuição.

## Histórico
- 2026-06-27: CAPI (engine + hash PII + dedupe + endpoint de teste) e fundação de atribuição
  (presets + preferência por tenant + API), ambas atrás de flag. Wiring de insights da atribuição
  marcado como passo final.
