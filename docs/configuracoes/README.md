# Configurações / Perfil

> Tela do usuário com perfil, plano/limites/addons, integrações, equipe e dados.
> Rota: `/settings`. Fonte de verdade desta tela.

## Decisões (2026-06-25)

- **Menu do usuário consolidado**: havia "Meu perfil" e "Assinatura" no menu do sidebar, **ambos
  iam para a mesma tela**. Mantida só **"Meu perfil"** (`/settings`) — o plano agora é uma aba lá
  dentro. (`/billing` continua existindo e redireciona para as configurações.)
- **Layout trocado**: saiu o **menu lateral** (esquerda) e entrou um **header com abas no topo**
  (estilo das páginas institucionais), com o conteúdo abaixo. Bonito em **dark e light** (usa
  `--surface-*`, `--border-color`, `--violet-bright`).

## Arquitetura

| Camada | Arquivo |
|---|---|
| Rota | `src/app/[locale]/(app)/settings/page.tsx` → `SettingsView` |
| **Layout (abas no topo)** | [`src/uxpilot-ui/adapters/SettingsContentLive.tsx`](../../src/uxpilot-ui/adapters/SettingsContentLive.tsx) |
| Painéis Geral/Integrações/Equipe/Dados | `src/components/SettingsClient.tsx` (`embedded bare activeTab=...`) |
| Painel Plano & Limites | `src/components/billing/BillingPortalClient.tsx` (`embedded`) |

## Abas

1. **Geral** — perfil/conta (login, senha, white-label).
2. **Plano** — `BillingPortalClient` embedded, agora com sub-abas visíveis: **Plano**, **Limites**
   (usado × total via `BillingLimitsPanel`), **Faturas**, **Eventos**, e **Addons**
   (`BillingAddonsCard`, planos pagos).
   - _Correção:_ no modo `embedded` o `BillingPortalClient` não mostrava o switcher de sub-abas
     (só o plano). Agora renderiza o `PageTabs` no embedded → limites/faturas/addons acessíveis.
3. **Integrações** — Meta OAuth + integrações futuras.
4. **Equipe** — membros do workspace.
5. **Dados** — dados/segurança.

## Pendências / próximos passos

- Enriquecer a aba **Geral** com mais infos do cliente/conta e a aba **Plano** com um resumo visual
  de uso (cards de limite estilo Destaques) — parte do plano de "design financeiro" em
  [landing-e-planos](../landing-e-planos/README.md#design-financeiro).
- Addons com **checkout real** no perfil (item #2 do roadmap).

## Componentes de DS usados (reutilizáveis)

A tela de Configurações é a **referência** do padrão flat. Guia completo:
**[docs/design-system/flat-panels.md](../design-system/flat-panels.md)**

| Componente | Uso em Configurações |
|------------|----------------------|
| `DsPageHeader` | Título + ícone accent |
| `DsTabBar` | Abas primárias (Geral, Plano, Integrações…) |
| `DsFlatPanel` | Container centralizado `max-w-5xl` |
| `DsUnderlineTabs` | Sub-abas (Plano, Limites, Faturamento…) |
| `DsFlatSection` | Seções Geral, Dados, addons |
| `DsFlatDivider` | Entre seções |
| `DsFlatChip` | Limites extras (+1 cliente…) |
| `DsFlatEmptyState` | Histórico vazio |
| `DsSectionHeader` | Títulos de Limites / Faturamento |
| `DsFormField` / `DsFormActions` | Campos e salvar |

Legado (`SettingsUi.tsx`) re-exporta do DS — prefira importar de `@/design-system` em código novo.

## Consistência de DS (2026-06-25)

- **Checkbox/radio nativos** usam `accent-color: var(--ui-accent)` — âmbar no light, roxo no dark (`globals.css`).
- **Logo do sidebar** alinhado à esquerda, na mesma indentação dos itens do menu.
- **Divisórias do menu do usuário** unificadas com `--sidebar-border` (igual ao sidebar).

## Alinhamento exato com os mocks (2026-06-25 parte 4) — **layout flat**

Os mocks NÃO usam cards na aba Plano nem wrapper de card nas demais sub-abas. Tudo é **flat**
(conteúdo direto no fundo, separado por **divisórias**), exatamente como nos prints. Foi removido o
`BillingPlanCard` (bloco roxo) deste fluxo. Toda a aba Plano é renderizada inline em
[`BillingPortalClient`](../../src/components/billing/BillingPortalClient.tsx):

- **Plano** (flat): "SEU PLANO ATUAL" + **nome grande** (`text-4xl`) + badges (● Ativo / ciclo);
  abaixo, **PRÓXIMA RENOVAÇÃO** (ícone violeta + data + "Cobrança …") e a nota "Para cancelar…".
  À direita: **"Seu plano está em dia"** (ícone violeta, flat). Uma **divisória** e então
  **"Limites extras"** (heading + botão **"Comprar limites →"** violeta-outline + chips
  `+1 cliente` / `+3 contas de anúncio` / `+50 sugestões IA`).
- **Limites**: heading "Seus limites atuais" no fundo + grid dos cards de limite
  (`BillingLimitsPanel`) — **sem** wrapper externo.
- **Faturamento**: heading "Faturas" + tabela direto no fundo.
- **Histórico**: heading + **empty state** (ícone + "Nenhum evento registrado." + `eventsEmptyHint`).

## Menu do avatar (sidebar) — redesign conforme mock (2026-06-25 parte 4)

[`SidebarUserBlock`](../../src/components/layout/SidebarUxChrome.tsx) refeito para bater com o print:

- **Header**: avatar quadrado violeta + nome + e-mail + chevron; badge **Administrador** (se admin).
- **Card do plano**: nome (✦) + "ciclo • Ativo" + data/Renovação + botão **"Gerenciar plano →"**
  (`/settings?tab=plan`). Dados via `GET /api/billing/subscription` (lazy, ao abrir).
- **Seções**: **Conta** (Meu perfil, Preferências, Aparência c/ toggle dark·light, Idioma),
  **Workspace** (Usuários, Planos e cobrança, Uso e limites, Integrações),
  **Ajuda e suporte** (Central de ajuda, Novidades c/ dot, Feedback),
  **Empresa** (Termos, Política de privacidade, Exclusão de dados), e **Sair da conta** (vermelho).
- Os itens de Workspace deep-linkam para as abas via **`/settings?tab=...`**
  (`SettingsContentLive` lê `?tab`). E-mail/plano vêm de `AppSidebar` → `SidebarFooter`.

> Ajustado por **inspeção dos mocks** (sem tooling de browser/screenshot no ambiente).

## Ferramentas avançadas (aba Integrações) — 2026-06-27

[`AdvancedToolsPanel`](../../src/components/settings/AdvancedToolsPanel.tsx) renderiza abaixo da aba
**Integrações**, com 3 seções (cada uma **some** se a flag estiver off, via 404): **Servidor MCP**
(gerar/revogar tokens, token exibido 1×), **CAPI** (cliente + evento de teste + status 24h/erro),
**Janela de atribuição** (salvar preferência + **Simular** read-only). Backends:
[mcp](../mcp/README.md), [meta-conversions](../meta-conversions/README.md).

## Histórico
- 2026-06-27: painel **Ferramentas avançadas** (MCP/CAPI/Atribuição) na aba Integrações.
- 2026-06-23: Padrão flat componentizado no DS (`DsFlatPanel`, `DsFlatSection`, …) + [flat-panels.md](../design-system/flat-panels.md).
- 2026-06-25 (parte 4): **layout flat** em todas as sub-abas de Configurações (como os mocks);
  menu do avatar refeito (header+plano+seções Conta/Workspace/Ajuda/Empresa); deep-link `?tab=`.
- 2026-06-25 (parte 3): tentativa com cards (revertida na parte 4 por divergir dos mocks).
- 2026-06-25 (parte 2): abas extraídas para o DS (`DsTabBar`) + `DsPageHeader`; superfícies do portal
  de planos/checkout harmonizadas no dark; logo do sidebar realinhado (`pl-[22px]`) com os ícones.
- 2026-06-25: Redesign para abas no topo; menu consolidado; sub-abas de billing expostas no embedded;
  checkbox âmbar (DS) global; logo e divisórias alinhados.
