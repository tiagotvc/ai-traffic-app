# Regras de Custom Audience da Meta — formato, restrições e correções

> Doc de processo para a criação de públicos via Marketing API. Complementa o [README de Públicos](./README.md).
> Última revisão: **2026-06-28**. Atualize a cada mudança no fluxo de criação de públicos.

Este documento consolida o que a Meta **realmente** aceita ao criar Custom Audiences via Graph API
(`POST /act_<id>/customaudiences`), os erros que enfrentamos (todos sob o código `#2654`) e as correções
aplicadas. A motivação: durante a preparação do screencast de App Review da Meta, a criação de públicos
falhava com mensagens enganosas. A investigação (docs oficiais + SDKs oficiais + testes ao vivo) revelou
várias divergências entre o nosso código e a API atual.

---

## 1. Formato canônico da regra (flexible spec)

A `rule` deve ser um **objeto JSON** (enviado como string via `JSON.stringify`) no formato *flexible spec*:

```jsonc
{
  "inclusions": {
    "operator": "or",
    "rules": [
      {
        "event_sources": [{ "id": "<ID>", "type": "<TYPE>" }],
        "retention_seconds": 2592000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "<EVENT_TOKEN>" }
          ]
        }
      }
    ]
  }
}
```

Pontos confirmados (docs oficiais + `facebook-*-business-sdk`):

- **Operador de igualdade do evento = `"eq"`** (não `"="`). `"i_contains"`/`"i_not_contains"` só valem para `field:"url"`.
- **`field` = `"event"`**; `value` = o token do evento.
- **`retention_seconds`** vai **dentro de cada rule** (irmão de `event_sources` e `filter`).
- O formato antigo compacto (`{"event":{"event_name":...}}` no nível do rule, ou maps abreviados) é
  **legado**; o backend foi padronizado para o flexible spec.

> Implementação: [src/lib/meta-audience-create.ts](../../src/lib/meta-audience-create.ts) —
> `buildWebsiteAudienceRule` e `buildEngagementAudienceRule`.

---

## 2. Os erros `#2654` que enfrentamos (e a causa real)

Todos os erros de criação de público retornam `code: 2654` — a mensagem/`error_subcode` é que muda.
**As mensagens são frequentemente enganosas** (a Meta cai num erro genérico de validação de regra).

| `code`/`error_subcode` | Mensagem | Causa real | Correção |
| --- | --- | --- | --- |
| `2654` / `1713151` | *"Invalid Event Name for Custom Audience: ... less than 50 characters ... alphanumeric and underscore."* | (a) nome de evento com espaço/acento/comprimento inválido **ou** (b) regra/subtipo que a API recusa, caindo nesta mensagem genérica. | Saneamento do nome do evento + correção de subtype/fonte (ver abaixo). |
| `2654` / `1870053` | *"The parameter 'subtype' is not supported in the current API version."* | Enviávamos `subtype: "WEBSITE"`/`"ENGAGEMENT"`. A Meta removeu `subtype` na criação (Marketing API v3+). | Remover `subtype` (exceto `VIDEO`). |
| `100` / `1713098` | *"Invalid rule JSON format."* | O caminho de **site** montava a regra no formato legado `event: { event_name }`, não aceito pela API atual. | Usar o flexible spec (`filter` → `field:"event"` → `operator:"eq"`), igual ao engajamento (ver §1). |

**Lição:** a mensagem "Invalid Event Name" **não significa necessariamente** que o nome está mal formatado —
pode ser a Meta recusando o tipo de público inteiro (ver §5, Instagram).

---

## 3. `subtype` foi descontinuado na criação

Desde o Marketing API v3, `subtype` **não é suportado** ao criar públicos de site/engajamento/offline —
o tipo é inferido pela `rule`. A **única exceção** é `VIDEO`, que ainda usa `subtype: "VIDEO"`.

```ts
// createWebsiteCustomAudience: sem subtype
// createEngagementCustomAudience:
const params = { name, rule: JSON.stringify(rule), prefill: "1" };
if (input.sourceType === "video") params.subtype = "VIDEO";
```

> `subtype: "CUSTOM"` ainda é usado em `createCombinedCustomAudience` (público combinado) — esse caminho
> não foi afetado pelo erro.

---

## 4. Saneamento obrigatório do nome do evento — `sanitizeMetaEventName`

A Meta exige que o `value` do evento tenha **≤ 49 caracteres** e contenha **apenas `[A-Za-z0-9_]`**.
Eventos padrão (`PageView`, `Purchase`, `Lead`...) já passam. O problema surgia com **conversões
personalizadas**, cujo nome de exibição ("Compra — Página de Vendas") tem espaço/acento/hífen.

Helper em [meta-audience-create.ts](../../src/lib/meta-audience-create.ts):

```ts
export function sanitizeMetaEventName(raw: string): string {
  const cleaned = (raw || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (cleaned || "Other").slice(0, 49);
}
```

Aplicado como trava final em **ambos** os builders de regra (site e engajamento). Na rota de opções
([options/route.ts](../../src/app/api/meta/audience-creation/options/route.ts)), conversões personalizadas
preferem o token padrão (`custom_event_type`) e **nunca** caem no nome de exibição cru:

```ts
metaEvent: c.custom_event_type && c.custom_event_type !== "OTHER"
  ? c.custom_event_type
  : sanitizeMetaEventName(c.name ?? c.id)
```

---

## 5. Por fonte: o que a API aceita

A ação de engajamento/evento **depende da fonte** escolhida. O catálogo (fonte de verdade) está em
`WEBSITE_PIXEL_EVENTS` e `ENGAGEMENT_ACTIONS` em
[meta-audience-create.ts](../../src/lib/meta-audience-create.ts) e é exposto pela rota de opções.

### Site (Pixel) — ✅ criável via API
- `type: "pixel"`, `id: <PIXEL_ID>`.
- Tokens padrão (case-sensitive): `PageView`, `ViewContent`, `Search`, `AddToCart`, `InitiateCheckout`,
  `AddPaymentInfo`, `Purchase`, `Lead`, `CompleteRegistration` (+ conversões personalizadas).

### Facebook — Página (`type: "page"`) — ✅ criável via API
- Tokens confirmados: `page_engaged`, `page_visited`, `page_messaged`, `page_cta_clicked`,
  `page_or_post_save`, `page_post_interaction`.
- ❌ **`page_liked` NÃO existe** (públicos de "curtida de página" foram descontinuados) — **removido** do catálogo.

### Instagram — perfil business (`type: "ig_business"`) — ⚠️ NÃO criável via API
- **Descoberta principal:** a Meta documenta que os subtipos **`IG_BUSINESS`, `FB_EVENT`, `EXPERIMENTAL`,
  `MULTI_DATA`** *"can only be created through Ads Manager, Audience Manager, and not through the API."*
- Por isso, criar um público de **engajamento de Instagram via API falha** — e a Meta devolve o erro
  enganoso `1713151` "Invalid Event Name" em vez de um erro claro de "tipo não suportado".
- O `id` correto seria o **INSTAGRAM_BUSINESS_PROFILE_ID** (conta conectada), mas **nenhum `id`/token
  faz a criação funcionar** — o subtipo é bloqueado.
- ❌ **`ig_user_followed_business` NÃO existe** (IG não expõe "seguir" como gatilho) — **removido** do catálogo.
- Tokens IG válidos no catálogo (para leitura/UI): `ig_business_profile_all`, `ig_business_profile_engaged`,
  `ig_business_profile_visit`, `ig_user_messaged_business`, `ig_business_profile_ad_saved`, famílias
  `ig_ad_*`/`ig_organic_*`.

> **Recomendação de produto:** demonstrar/oferecer criação via API apenas para **Site (Pixel)**,
> **Facebook (Página)**, **Lookalike** e **Salvo**. Para públicos de **Instagram**, encaminhar a criação ao
> Gerenciador de Anúncios da Meta (e apenas ler/gerenciar via API). Decisão final pendente de validação no BM
> do cliente (ver §7).

### Retenção máxima por fonte (`retention_seconds`)
| Fonte | Máx |
| --- | --- |
| Site (pixel) | 180 dias |
| Página / IG | 365 dias (UI) / 730 (máx API) |
| Lead | 90 dias |
| Vídeo | 365 dias |

---

## 6. UI: ações dinâmicas por fonte (`AudienceCreatorUxPage`)

**Bug corrigido:** o passo "Regras" exibia uma lista **fixa** de 5 ações, independente da fonte — ao escolher
**Site (Pixel)** apareciam ações de Instagram/Facebook.

Correção em [AudienceCreatorUxPage.tsx](../../src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx):

- `ruleActionOptions` (memo) deriva a lista da fonte selecionada, a partir do catálogo de `options`:
  - `site` → `options.websiteEvents`
  - `instagram` → `options.engagementActions.ig_business`
  - `facebook` → `options.engagementActions.page`
- Efeito de reset mantém a seleção válida ao trocar a fonte.
- `handleCreate` envia o **evento real selecionado** (`ruleAction`) — removido o `eventMap` lossy que
  travava o site em `PageView`/`Purchase`/`Lead`.
- Revisão mostra rótulos legíveis (`ruleActionLabel`, `sourceLabel`) em vez de tokens crus.
- Estética (componentes `AudienceChoiceRow`, `campaign-creator-card`) **inalterada**.

---

## 7. Prova definitiva (read-back) para casos ambíguos

Quando a doc é ambígua (ex.: confirmar o `id`/token exato que a Meta aceita para uma fonte), o caminho
de verdade é **criar o público no Gerenciador de Anúncios e ler a regra de volta**:

```
GET https://graph.facebook.com/v19.0/<audience_id>?fields=name,subtype,rule,rule_v2,operation_status&access_token=<TOKEN>
```

O `rule` retornado mostra exatamente o `event_sources.type`/`id`, o token e o `subtype` que a Meta gravou.

---

## 8. Mapa de arquivos (deste fluxo)

| Camada | Arquivo |
| --- | --- |
| Builders de regra + saneamento + catálogos | [src/lib/meta-audience-create.ts](../../src/lib/meta-audience-create.ts) |
| Rota de opções (catálogo por conta) | [src/app/api/meta/audience-creation/options/route.ts](../../src/app/api/meta/audience-creation/options/route.ts) |
| Criar público de site (Pixel) | [src/app/api/meta/audiences/website/route.ts](../../src/app/api/meta/audiences/website/route.ts) |
| Criar público de engajamento | [src/app/api/meta/audiences/engagement/route.ts](../../src/app/api/meta/audiences/engagement/route.ts) |
| Wizard (UI por fonte) | [src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx](../../src/uxpilot-ui/adapters/AudienceCreatorUxPage.tsx) |

---

## 9. Checklist de verificação (antes da apresentação Meta)

- [ ] **Site (Pixel)** com "todos os visitantes" cria sem `#2654` (subtype removido).
- [ ] **Site (Pixel)** com conversão personalizada de nome "feio" cria (saneamento).
- [ ] **Facebook (Página)** com `page_engaged` cria.
- [ ] **Instagram**: confirmar via read-back se o BM permite criação por API; se não, **não demonstrar IG ao vivo**.
- [ ] No passo "Regras", as ações **mudam conforme a fonte** (site mostra eventos de site).
- [ ] **Lookalike** e **Salvo** criam normalmente.

---

## Histórico
- **2026-06-28:** Criação do doc. Correções: remoção de `subtype` na criação (site/engajamento),
  `sanitizeMetaEventName`, remoção de tokens inexistentes (`page_liked`, `ig_user_followed_business`),
  ações dinâmicas por fonte no `AudienceCreatorUxPage`, descoberta de que **IG engagement não é criável via API**.
- **2026-06-28:** Regra de **site** migrada do formato legado `event: { event_name }` para o flexible spec
  (`filter` → `field:"event"` → `operator:"eq"`) — corrige `#100`/`1713098` "Invalid rule JSON format".
