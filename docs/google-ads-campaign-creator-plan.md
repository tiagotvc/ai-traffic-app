# Criador de campanhas Google Ads — levantamento e plano

## Decisão de escopo

O primeiro modo Google Ads será exclusivo para campanhas de **Pesquisa**. Display,
Performance Max, Shopping, vídeo e app ficam fora do MVP porque exigem recursos,
assets, feeds e regras de publicação diferentes.

O criador atual é estruturalmente Meta: seu rascunho contém `adsets`, página,
pixel, posicionamentos Facebook/Instagram e publica em `/api/meta/campaigns`.
O modo Google deve compartilhar apenas a casca do assistente (cliente, autosave,
IA, revisão e progresso), mantendo schema, etapas, validações e publisher próprios.

## Hierarquia que precisa ser criada

Uma campanha de Pesquisa publicável exige, nesta ordem:

1. `CampaignBudget` — orçamento médio diário em micros, não compartilhado no MVP.
2. `Campaign` — canal `SEARCH`, status inicial `PAUSED`, orçamento, datas, redes e lance.
3. `CampaignCriterion` — idiomas, locais incluídos/excluídos e, futuramente, agenda.
4. `AdGroup` — tema, status e lance quando a estratégia exigir CPC no grupo.
5. `AdGroupCriterion` — palavras-chave e tipos `EXACT`, `PHRASE` ou `BROAD`.
6. `AdGroupAd` com `ResponsiveSearchAd` — URL final, caminhos, títulos e descrições.

A publicação deve usar `GoogleAdsService.Mutate` com nomes temporários negativos.
Assim toda a árvore pode ser validada e criada de forma atômica; se uma operação
falhar, nada fica criado pela metade. A campanha nasce pausada e só pode ser
ativada por uma ação explícita posterior.

## Modelo de rascunho proposto

```ts
type GoogleSearchCampaignDraft = {
  version: 1;
  platform: "google";
  clientSlug: string;
  customerId: string;
  managerCustomerId?: string;
  campaign: {
    name: string;
    dailyBudgetBRL: number;
    startDate?: string;
    endDate?: string;
    bidding: {
      strategy: "maximize_clicks" | "maximize_conversions" | "maximize_conversion_value" | "manual_cpc";
      targetCpaBRL?: number;
      targetRoas?: number;
      maxCpcBRL?: number;
    };
    searchPartners: boolean;
    displayExpansion: boolean;
    locations: GoogleGeoTarget[];
    excludedLocations: GoogleGeoTarget[];
    locationPresence: "presence" | "presence_or_interest";
    languageIds: string[];
    negativeKeywords: GoogleKeywordDraft[];
  };
  adGroups: Array<{
    id: string;
    name: string;
    defaultCpcBRL?: number;
    keywords: GoogleKeywordDraft[];
    ads: GoogleResponsiveSearchAdDraft[];
  }>;
  meta?: {
    creationMode?: "manual" | "ai";
    validatedAt?: string;
    publishedAt?: string;
    googleCampaignId?: string;
  };
};
```

O banco pode continuar usando `campaign_templates.payload` (JSONB), desde que o
schema raiz ganhe um discriminador `platform`. Isso evita misturar regras Google
no schema Meta e mantém compatibilidade com os rascunhos existentes.

## Etapas da interface

1. **Plataforma e conta** — Meta ou Google; cliente, MCC e conta anunciante.
2. **Objetivo e campanha** — inicialmente Tráfego, Leads ou Vendas, nome e datas.
3. **Orçamento e lances** — orçamento diário, estratégia e metas opcionais.
4. **Segmentação** — locais, exclusões, presença/interesse, idiomas e redes.
5. **Grupos e palavras-chave** — vários grupos temáticos, match type e negativas.
6. **Anúncios responsivos** — URL final, dois paths, 3–15 títulos e 2–4 descrições.
7. **Revisão** — árvore completa, avisos, estimativas, dry-run e publicação pausada.

## IA no fluxo

A IA não deve publicar nem escolher silenciosamente. Ela gera candidatos editáveis:

- recebe site/landing page, produto, região, objetivo, diferenciais e tom de voz;
- cria temas de grupos semanticamente separados;
- sugere palavras-chave seed e negativas iniciais;
- combina as seeds com `KeywordPlanIdeaService`, que fornece ideias e métricas reais;
- classifica por intenção, relevância, volume, concorrência e CPC histórico;
- sugere 8–15 títulos (máximo 30 caracteres), 2–4 descrições (máximo 90) e paths
  (máximo 15), sem alegações inventadas;
- verifica duplicação, cobertura de benefícios/CTA/keyword e compatibilidade de URL;
- permite aceitar/rejeitar cada sugestão e registra o que foi aprovado pelo usuário.

Resultados do Keyword Planner devem ser persistidos em cache porque o serviço tem
limites mais restritos e suas métricas históricas mudam lentamente.

## APIs internas necessárias

- `GET /api/google-ads/creator/options` — conta, moeda, timezone, conversões e capacidades.
- `GET /api/google-ads/geo-targets?q=` — sugestões de `GeoTargetConstant`.
- `GET /api/google-ads/languages?q=` — idiomas suportados.
- `POST /api/google-ads/keyword-ideas` — seeds/URL, localização, idioma e métricas.
- `POST /api/google-ads/creator/ai-suggestions` — grupos, keywords, negativas e RSA.
- `POST /api/google-ads/campaigns/validate` — mutate completo com `validateOnly: true`.
- `POST /api/google-ads/campaigns` — mesma montagem, publicação real e auditoria.

O backend deve resolver OAuth e `login-customer-id` pelo vínculo salvo no cliente;
`customerId` e MCC enviados pelo navegador nunca devem ser tratados como autoridade.

## Validações mínimas

- conta anunciante (não MCC), moeda/timezone conhecidos e faturamento válido;
- orçamento positivo convertido para micros sem perda indevida;
- estratégia compatível com campanha de Pesquisa e campos condicionais coerentes;
- pelo menos uma localização e um idioma;
- ao menos um grupo, uma palavra-chave válida e um RSA por grupo;
- RSA com 3–15 títulos, 2–4 descrições e URL HTTPS válida;
- títulos até 30, descrições até 90 e paths até 15 caracteres;
- keywords sem duplicatas semânticas por texto/match type;
- nomes temporários únicos e operações ordenadas por dependência;
- `validateOnly` obrigatório antes da publicação real;
- idempotency key para impedir campanha duplicada por duplo clique/retry;
- auditoria sem armazenar access/refresh tokens ou outros segredos.

## Permissões e bloqueio atual

O OAuth já usa o escopo `https://www.googleapis.com/auth/adwords`, suficiente para
leitura e escrita quando o developer token permitir. Entretanto, o checklist local
registra o token atual como **Reporting/somente leitura**. Até obter Basic Access e
aprovação de uso **Ad creation and management**, mutações reais em produção podem
retornar `403 PERMISSION_DENIED`.

O desenvolvimento deve seguir com conta de teste e `validateOnly`. A interface deve
mostrar claramente “Validação Google disponível; publicação real aguardando aprovação”
quando a capacidade de escrita não estiver liberada.

## Fases de implementação

### Fase 1 — fundação e publicação manual de Pesquisa

- discriminador de plataforma e schema Google separado;
- seletor Meta/Google e novas etapas;
- options/geo/language;
- builder atômico de operações e endpoint `validateOnly`;
- publisher real protegido por capability/feature flag;
- logs de auditoria e idempotência.

### Fase 2 — assistência por IA e Keyword Planner

- sugestões estruturadas de grupos, keywords, negativas e RSA;
- métricas reais e cache do Keyword Planner;
- revisão granular e contadores de caracteres;
- qualidade local do anúncio antes do dry-run.

### Fase 3 — gestão pós-publicação

- editar todas as configurações expostas no criador;
- ativar, pausar e remover árvore Google;
- importar/duplicar campanha de Pesquisa;
- recomendações e forecast antes da publicação.

### Fora do MVP

- Performance Max, Display responsivo, Shopping, vídeo, app;
- criação automática de conversões;
- assets de imagem/vídeo, Merchant Center e feeds;
- publicação totalmente autônoma pela IA.

## Critérios de aceite do MVP

- um usuário cria e reabre um rascunho Google sem afetar rascunhos Meta;
- o dry-run valida a árvore completa na conta selecionada;
- um retry não cria campanha duplicada;
- publicação cria orçamento, campanha pausada, critérios, grupos, keywords e RSAs;
- IDs retornados são persistidos e a campanha aparece no painel após sincronização;
- erros Google aparecem por campo/recurso, não apenas como mensagem genérica;
- nenhuma sugestão da IA é publicada sem revisão explícita.
