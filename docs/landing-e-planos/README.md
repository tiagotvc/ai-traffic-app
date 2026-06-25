# Landing Page, Planos, Addons e Login (marketing)

> Mapa + decisões + roadmap (2026-06-25). Inclui como acessar a landing, análise vs. concorrentes,
> recomendação de planos/preços e venda de addons.

## Como acessar a landing (dev)

- **URL:** `http://localhost:3008/pt-BR/` (ou `/en/`). Porta **3008** (`next dev -p 3008`).
- Rota: `src/app/[locale]/(marketing)/page.tsx` → `LandingPage`
  ([`src/components/marketing/LandingPage.tsx`](../../src/components/marketing/LandingPage.tsx)),
  dentro do `MarketingShell` (header/footer).
- i18n `localePrefix: "always"` → a home pública **exige** o prefixo de locale (`/pt-BR/`). Acessar
  `/` redireciona para o locale padrão.

## Estrutura atual da landing

Hero → Missão/Visão → Capabilities (6 cards) → Product Preview → **Stack Cost Comparison**
(comparativo de custo vs. stack de ferramentas) → **Pricing** (`BillingPlansClient variant="marketing"`)
→ CTA → Footer. Componentes em `src/components/marketing/*`.

## Planos hoje

- **Backend (`Plan` entity + migration 0045):** `free`, `individual` (R$49,90), `advanced` (R$109,90),
  `advanced-pro` (R$159,90), `agency` (R$259,90), `agency-pro` (R$499,90). Limites por plano em
  `src/lib/billing/types.ts` (`*_LIMITS`).
- **Landing mostra 4:** free, individual, advanced, agency
  ([`BillingPlansClient.tsx`](../../src/components/billing/BillingPlansClient.tsx)).

## Concorrente: Reportei (pesquisa)

- Planos por **número de projetos (clientes)**; relatórios ilimitados; **créditos de IA por plano**
  e **IA extra como add-on**; ~32 integrações; membros de equipe por plano.
- Faixa de preço: começa ~**R$74,90/mês** (Starter, até ~5 clientes) e vai até ~R$300/mês (Premium).
  Ticket "agência" gira em torno de **~R$250**.
- Fontes: [planos Reportei](https://reportei.com/planos-e-precos/) ·
  [pricing (Capterra)](https://www.capterra.com/p/180418/Reportei/pricing/) ·
  [pricing (G2)](https://www.g2.com/products/reportei/pricing).

**Leitura:** nosso **Agency (R$259,90)** já está alinhado ao ticket da Reportei. Diferenciais a
destacar: workspace BR (PIX/NF), **Cérebro da agência (IA)**, dashboards canvas e automações no
mesmo preço (vs. stack de várias assinaturas) — já existe a seção "Stack Cost Comparison" que
explora isso (reforçar).

## Recomendação de planos (decisão a validar)

Migrar a vitrine para **4 planos**: **Individual · Advanced · Agency · Personalizado**.

- **Não mostrar "Free" como plano** na landing — tratá-lo como **trial de 7 dias** (CTA "Comece grátis"),
  não como coluna de preço. (O free continua existindo no backend como trial.)
- **Personalizado**: card "Fale com a gente" (sem preço fixo) para agências grandes / necessidades
  custom — leva a contato/WhatsApp.
- **IA extra como add-on** (igual Reportei): cobrar por créditos de IA adicionais.

> ⏳ **Pendente de implementação** (requer ajuste de plan-catalog/landing + entitlements). É uma
> mudança de produto/pricing — recomendo fazer num passo dedicado após validar os números.

## Addons (venda de extras)

- **Infra já existe:** `TenantAddon` (extras de limite: +clientes, +contas, +membros, +regras,
  +IA, +relatórios) e `DashboardAddon`. UI: [`BillingAddonsClient.tsx`](../../src/components/billing/BillingAddonsClient.tsx)
  em `/billing/addons` — hoje apenas "solicita" (sem checkout integrado).
- **A fazer (MVP):** seção no **perfil** (`/settings` → aba Addons) listando addons compráveis
  (+1 cliente, +1 conta, +pacote de IA) com **checkout real** (reusar `startCheckout`/Asaas/Stripe)
  e aplicar via `TenantAddon`. Manter simples: 3-4 addons.

## Login — painel de marketing (esquerda)

- Componente: [`LoginMarketingPanel`](../../src/components/auth/LoginMarketingPanel.tsx) +
  [`LoginMarketingSlider`](../../src/components/auth/LoginMarketingSlider.tsx) — **carrossel de 5 slides**
  (missão, visão, "o que temos hoje", roadmap, demo do produto). Já é rico.
- **Correção feita:** o painel direito (form) cortava o botão "Criar conta" no desktop
  (`lg:overflow-hidden`) — agora rola (`overflow-y-auto`).
- **A revisar:** garantir que o slide "o que temos hoje" liste tudo que já existe (Destaques, Visões,
  Clientes, Campanhas, Públicos, Classificação de criativos, Cérebro da agência, Relatórios,
  Automações). Pequenos ajustes de copy/CTA recomendados.

## Design financeiro

- Telas: usuário (`/settings?tab=plan`, checkout, invoices, `BillingGateModal`) e admin
  (`/admin/billing/{finance,plans,coupons,refunds}`).
- **Fraquezas:** admin finance/invoices visualmente simples; sem preview de limites no checkout;
  sem UI admin para atribuir plano. Plano: padronizar com `PageToolbar` + cards de métrica
  (estilo Destaques) no admin finance, e melhorar a tabela de invoices.
- ⏳ Implementação visual pendente (passo dedicado).

## Status de implementação

| Item | Status |
|---|---|
| Login: botão "Criar conta" cortado | ✅ corrigido |
| Login (#6): slide "o que temos hoje" cobrindo todas as features | ✅ feito (Destaques, Visões, Clientes, Campanhas, Públicos, Criativos, Cérebro, Relatórios, Automações) |
| URL da landing documentada | ✅ |
| Pesquisa Reportei + recomendação de planos | ✅ documentado (implementação pendente) |
| Reduzir vitrine para 4 planos / ocultar free | ✅ feito — vitrine = Individual, Advanced, Agency, **Personalizado** (card de contato); Free vira trial (CTA do hero). `BillingPlansClient` (marketing) + `ContactPlanCard`. |
| Addons no perfil com checkout | 🟡 parcial — solicitação **funcional** (`POST /api/billing/addons/request` → persiste como ContactMessage no `/admin/contacts` + e-mail ao suporte; admin concede via `PATCH /api/admin/tenants/[id]/addons`). **Cobrança self-serve** (SKUs de addon nos provedores) = follow-up de produto (não feito por risco em pagamentos). |
| Landing: melhorias de conteúdo/"tchan" | 🟡 parcial — adicionada seção **FAQ** (`LandingFaq`, reusa o conteúdo de suporte) antes do CTA; vitrine agora com 4 cards. Redesign mais profundo + comparativo direto com concorrentes + provas sociais = follow-up (subjetivo, revisar visualmente). |
| Design financeiro | 🟡 parcial — **dark mode harmonizado** (admin finance, admin de usuários, limites, addons, faturas: trocados `bg-white`/tints claros por superfícies do DS e tints translúcidos). UI de **atribuir plano** e **addons** já existia no detalhe do usuário admin; **preview de limites** já existe no checkout. Redesign visual mais ambicioso = follow-up. |

## Histórico
- 2026-06-25: Documentação criada; correção do corte do botão de cadastro no login.
