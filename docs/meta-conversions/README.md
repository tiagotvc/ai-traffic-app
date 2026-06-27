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

- **Fonte do pixel**: `client_meta_settings.metaPixelId` ou o 1º de `linkedMetaPixelIds` (vinculados
  ao cliente — base adicionada na migração `0052`).
- **Token**: `resolveWorkspaceMetaAccessToken(tenantId, userId)`.
- **Dedupe (P0.2)**: passe o mesmo `event_id` no pixel do navegador e na CAPI.
- **Expectativa honesta**: match real ~10–45% do sinal perdido (não "100%").

**Critério de pronto (P0):** `POST /api/meta/capi/test {clientId, testEventCode}` → o evento aparece
em **Events Manager → Test Events** com `event_id` (dedupe) e PII hasheada. ✅

**Pendente (P0.3/P0.4):** mapear eventos a partir de dados reais (checkout/offline) e UI/observabilidade
(toggle por cliente, "eventos enviados 24h", último erro). O **engine + teste** já estão prontos.

## Atribuição — P2 (fundação)

Preferência de **janela/modelo de atribuição** por workspace, aplicável aos relatórios.

| Peça | Arquivo |
|---|---|
| Presets + resolver | [`src/lib/meta-attribution.ts`](../../src/lib/meta-attribution.ts) (`ATTRIBUTION_PRESETS`, `resolveAttributionWindows`) |
| Preferência por tenant | [`src/lib/tenant-attribution.ts`](../../src/lib/tenant-attribution.ts) + coluna `tenants.attributionWindow` (migração `0054`) |
| API | [`/api/meta/attribution`](../../src/app/api/meta/attribution/route.ts) (GET/PUT, admin, gate `meta.attribution`) |

Presets: `default` (= comportamento atual da Meta), `1d_view`, `1d_click`, `7d_click`,
`7d_click_1d_view`, `28d_click_1d_view`.

> **Decisão de segurança:** `resolveTenantAttributionWindows(tenantId)` retorna `null` (sem alteração)
> quando a flag está OFF ou não há preferência — **preservando 100% o comportamento atual dos
> relatórios**. O **wiring no pipeline de insights** (`meta-graph`/`meta-insights-cache` → passar
> `action_attribution_windows`) ficou **deliberadamente como passo final**, para não desestabilizar
> os relatórios que já estão estáveis ("redondinho"). `resolveTenantAttributionWindows` é o ponto de
> plugagem pronto para isso.

## Flags
- `meta.capi` — liga a Conversions API.
- `meta.attribution` — liga a preferência de atribuição.

## Histórico
- 2026-06-27: CAPI (engine + hash PII + dedupe + endpoint de teste) e fundação de atribuição
  (presets + preferência por tenant + API), ambas atrás de flag. Wiring de insights da atribuição
  marcado como passo final.
