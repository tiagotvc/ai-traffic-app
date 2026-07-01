# Analytics & Rastreio do site (GTM + GA4 + Meta Pixel/CAPI)

Rastreamento do **site** (orionagency.io): visitas, eventos-chave e conversões.
Arquitetura escolhida: **GTM como container central**, com **consentimento primeiro**
(LGPD) e **Meta via Pixel + Conversions API** (server-side) com deduplicação.

> Isto é sobre o rastreio do **nosso site**. Não confundir com
> `docs/meta-conversions` (tracking de conversão dentro das campanhas dos clientes).

## Arquitetura

```
Navegador                                   Servidor
─────────                                   ────────
CookieConsentBanner  ──(aceite)──►  AnalyticsProvider carrega o GTM
                                          │
                                          ├─ dataLayer.push({event:'page_view', ...})
                                          ├─ dataLayer.push({event:'meta_event', ...})   ──► GTM: GA4 + Meta Pixel
                                          │
trackMetaEvent() ─────────────────────────┴─────────► POST /api/track/meta
   (mesmo event_id no Pixel e no CAPI)                  └─ Meta Conversions API
                                                           (email/telefone SHA-256)
```

- **GTM é o hub**: GA4 e Meta Pixel são configurados **no painel do GTM**, não no código.
  Novas tags de marketing não exigem deploy.
- **Consent-first**: o GTM **só carrega após "Aceitar"** no banner. Rejeitou/não decidiu →
  zero rastreio. Ver [`src/lib/cookie-consent.ts`](../../src/lib/cookie-consent.ts).
- **Meta dedup**: `trackMetaEvent()` dispara o Pixel (via dataLayer → GTM) **e** o CAPI
  (server), com o **mesmo `event_id`** → a Meta deduplica o par.

## Arquivos

| Arquivo | Papel |
|---|---|
| [`src/lib/analytics.ts`](../../src/lib/analytics.ts) | Helpers: `trackEvent`, `trackPageView`, `trackMetaEvent`, `pushDataLayer`. Todos no-op sem consentimento. |
| [`src/components/analytics/AnalyticsProvider.tsx`](../../src/components/analytics/AnalyticsProvider.tsx) | Carrega o GTM (consent-gated) e emite `page_view` a cada troca de rota (SPA). Montado no layout raiz. |
| [`src/app/api/track/meta/route.ts`](../../src/app/api/track/meta/route.ts) | Endpoint da Conversions API (server). Hasheia PII (SHA-256) antes de enviar à Meta. |
| [`src/lib/public-routes.ts`](../../src/lib/public-routes.ts) | `/api/track/*` liberado para visitante deslogado. |
| [`src/app/layout.tsx`](../../src/app/layout.tsx) | Injeta `<AnalyticsProvider/>` no site todo. |

## Variáveis de ambiente

```bash
NEXT_PUBLIC_GTM_ID="GTM-XXXXXXX"   # Admin do GTM → Install Google Tag Manager (público)
META_PIXEL_ID=""                   # Events Manager → Pixel/dataset (número)
META_CAPI_ACCESS_TOKEN=""          # Pixel → Conversions API → Gerar token de acesso
```

- Sem `NEXT_PUBLIC_GTM_ID` → nada carrega (fail-safe).
- Sem `META_PIXEL_ID`/token → `/api/track/meta` vira **no-op** (o Pixel do navegador segue).
- `NEXT_PUBLIC_*` é embutida no **build/start** — reinicie o dev após alterar.

## Configuração no painel do GTM (uma vez)

1. **GA4 Configuration** — tag "Google Tag" (`G-XXXX`), trigger **Initialization – All Pages**.
2. **GA4 Event `page_view`** — trigger **Custom Event** = `page_view`
   (o app empurra esse evento nas trocas de rota, com `page_path`/`page_location`/`page_title`).
3. **Meta Pixel base** — tag HTML com o código do Pixel, trigger **All Pages**.
4. **Meta Pixel evento** — dispara nos eventos `meta_event` do dataLayer.
   Crie variáveis de dataLayer `meta_event_name` e `meta_event_id` e passe o id ao Pixel:
   ```js
   fbq('track', {{meta_event_name}}, {}, { eventID: {{meta_event_id}} });
   ```
   O `eventID` é o que **deduplica** com o CAPI.

## Disparando eventos no código

```ts
import { trackEvent, trackMetaEvent } from "@/lib/analytics";

// Evento GA4 genérico (via GTM)
trackEvent("cta_click", { cta: "hero_signup" });

// Conversão Meta (Pixel + CAPI, dedup automático)
await trackMetaEvent("Lead", {
  customData: { content_name: "trial_form" },
  userData: { email }   // hasheado no servidor; nunca vai cru para a Meta
});
```

Eventos Meta suportados (`MetaEventName`): `Lead`, `CompleteRegistration`, `Contact`,
`ViewContent`, `InitiateCheckout`, `Subscribe`, `StartTrial`.

`page_view` é **automático** a cada navegação — não precisa chamar.

## Testes

1. `npm run dev` → abrir o site → **Aceitar** cookies.
2. Console: `window.dataLayer` deve existir e receber `page_view` ao navegar.
3. Network: requisição `gtm.js?id=GTM-XXXX` presente.
4. **GTM Preview / Tag Assistant**: ver GA4 e Pixel disparando.
5. **Events Manager → Testar eventos**: ver Pixel + CAPI (`action_source: website`) deduplicados.
6. Aba anônima → **Rejeitar** cookies → confirmar que o GTM **não** carrega.

## LGPD / Consentimento

- Nenhum script de rastreio roda antes do aceite explícito.
- A escolha persiste em `localStorage` (`orion-cookie-consent`) e emite o evento
  `orion:cookie-consent`, que o `AnalyticsProvider` escuta para carregar o GTM na hora
  em que o usuário aceita (sem reload).
- PII enviada ao CAPI é hasheada (SHA-256) no servidor; valores crus nunca saem do backend.
