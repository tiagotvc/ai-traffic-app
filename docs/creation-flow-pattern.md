# Padrão de fluxo de criação/edição (lista → escolha → stepper)

> **Padrão oficial.** Toda feature nova de **criar/editar uma entidade** (campanha, persona, zona,
> regra de automação, relatório, dashboard…) deve seguir este fluxo e reusar estes componentes. Ao
> criar/alterar um fluxo de criação, atualize este doc.

Complementa o [Design system do criador](./campaign-creator-design-system.md) e o
[Design system global](./design-system.md).

## Índice
1. [As três etapas do padrão](#1-as-três-etapas-do-padrão)
2. [Etapa A — Tela-lista](#2-etapa-a--tela-lista)
3. [Etapa B — Modal de escolha (template × personalizado)](#3-etapa-b--modal-de-escolha-template--personalizado)
4. [Etapa C — Tela de stepper (página dedicada)](#4-etapa-c--tela-de-stepper-página-dedicada)
5. [Estado: local × Context](#5-estado-local--context)
6. [Exemplares de referência](#6-exemplares-de-referência)
7. [Checklist para uma nova feature](#7-checklist-para-uma-nova-feature)

---

## 1. As três etapas do padrão

```
Tela-lista ──"Criar"──▶ Modal de escolha ──┬─ "Personalizada" ─▶ Stepper (vazio)
(gestão)                (template×custom)   └─ Template ────────▶ Stepper (pré-preenchido)
                                                                      │
                                                                  Salvar ─▶ volta à lista
```

- **A. Lista** — superfície de gestão da entidade (CRUD): listar, ativar/pausar, editar, excluir.
- **B. Modal de escolha** — ao clicar "Criar", um modal pergunta **como** criar: a partir de um
  **template** (cards de check) ou **personalizado** (do zero). Padrão das modais já existentes.
- **C. Stepper** — **página dedicada** (rota própria) no estilo dos criadores de campanha/persona.
  Templates **pré-preenchem** o stepper (o usuário revisa/ajusta antes de salvar).

> Para fluxos triviais (1–2 campos) a etapa B pode ser dispensada e "Criar" abre o stepper direto. A
> etapa B só existe quando há **templates** ou **modos** de criação a escolher.

---

## 2. Etapa A — Tela-lista

- `PageToolbar` (ícone + título + subtítulo + ação "Criar"). Veja
  [`AutomationsRulesView`](../src/components/AutomationsRulesView.tsx).
- Lista com **empty state** que repete o CTA "Criar".
- A ação "Criar" e o CTA do empty state **abrem o modal da Etapa B** (estado `modalOpen`); o modal,
  ao continuar, **navega** para a rota do stepper (`useRouter().push` de `@/i18n/navigation`).

## 3. Etapa B — Modal de escolha (template × personalizado)

Reusar **sempre**:
- [`CreatorModalShell`](../src/components/campaign-creator/CreatorModalShell.tsx) — shell canônico
  (header + corpo + footer Cancelar/Continuar). `width` `md`/`lg`/`xl`.
- [`CreationModeChoiceCard` + `CreationModeChoiceGrid`](../src/components/campaign-creator/CreationModeChoiceCard.tsx)
  — **cards de check do DS** (grid responsivo 1–3 col automático; seleção única, `role=radiogroup`).
  Use `aiCredits` no card quando o modo consome créditos de IA.
- Footer: `primaryLabel="Continuar"`, `primaryDisabled` até haver seleção.

Modelos de referência: [`PersonaCreateModeSheet`](../src/components/audiences/PersonaCreateModeSheet.tsx)
(manual/IA/existente) e [`AutomationCreateModeModal`](../src/components/automations/AutomationCreateModeModal.tsx)
(personalizada + templates). Ao continuar, **navegue** para o stepper passando o modo/template por
query (`?mode=custom` ou `?template=<id>`).

## 4. Etapa C — Tela de stepper (página dedicada)

O stepper é uma **rota própria** (não um modal), para ter espaço, foco e URL compartilhável.

**Rota** (`src/app/[locale]/(app)/<feature>/.../new/`):
- `layout.tsx` — wrapper do shell (copie de
  [automations/rules/new/layout.tsx](../src/app/[locale]/(app)/automations/rules/new/layout.tsx)):
  ```tsx
  <div data-campaign-creator-shell className="app-shell-breakout flex min-h-0 flex-1 flex-col"
       style={{ background: "var(--surface-bg)" }}>{children}</div>
  ```
  `data-campaign-creator-shell` aplica os tokens CSS do criador; herda os gates do layout pai
  (ModuleGate/PlanNavGate) — **mantenha o stepper sob a mesma rota da feature** para herdar o gating.
- `page.tsx` — `<Suspense><FeatureCreatorView /></Suspense>`.

**View (shell do stepper)** — veja
[`AutomationRuleCreatorView`](../src/components/automations/AutomationRuleCreatorView.tsx) como
referência mínima. Estrutura (classes CSS reaproveitadas):
- **Header** `.campaign-creator-header` com [`PageTitleBlock`](../src/design-system/components/PageTitleBlock.tsx)
  (breadcrumb no `subtitle` linkando de volta à lista) + botão fechar (`X` → lista).
- **Stepper** `.campaign-creator-stepper-row` + [`UxHorizontalStepper`](../src/uxpilot-ui/adapters/ux-wizard-primitives.tsx)
  (`steps: {number,label,disabled?}`, `current`, `onStepClick`; `size="mini"`).
- **Conteúdo** `.campaign-creator-step-panel` / `.campaign-creator-step-scroll` — renderiza o step
  ativo. Cada passo é um componente em `steps/` que recebe o estado + um `update(patch)`.
- **Sidebar** `.campaign-creator-sidebar` (direita, lg+) — preview/insights ao vivo + a navegação.
- **Navegação** `.ui-wizard-nav--sidebar` / `--footer` (mobile) com botões Voltar/Próximo/Salvar
  (`ui-btn-secondary`/`ui-btn-accent`). "Voltar" no passo 1 = "Cancelar" (volta à lista).
- **Campos**: reusar [`FilterTextField`](../src/components/FilterTextField.tsx) e
  [`FilterSelectDropdown`](../src/components/FilterSelectDropdown.tsx) com `creatorField`.
- **Salvar**: `POST` na API da feature → tratar erro **402** (limite de plano) inline → `router.push`
  de volta à lista + `router.refresh()`.

**Templates pré-preenchem**: a view lê `?template=<id>` e semeia o estado inicial a partir de um
módulo de dados compartilhado (ex.: [`rule-templates.ts`](../src/lib/automation/rule-templates.ts)),
reusado por lista, modal e stepper — sem duplicar tipos/helpers.

## 5. Estado: local × Context

- **Estado local** (`useState` na view) basta para steppers curtos (≈2–4 passos, payload simples).
  Ex.: regra de automação.
- **Context provider** quando o estado é grande/compartilhado entre muitos subcomponentes, há
  auto-save, ou múltiplas sub-árvores leem/escrevem. Ex.:
  [`CampaignDraftContext`](../src/components/campaign-creator/CampaignDraftContext.tsx) (payload +
  auto-save) e [`PersonaCreatorScoreContext`](../src/components/audiences/create/PersonaCreatorScoreContext.tsx)
  (score/insights). Siga esse padrão de Provider quando escalar.

## 6. Exemplares de referência

| Feature | Lista | Modal de escolha | Stepper (view / rota) |
|---|---|---|---|
| **Campanha** | `/campaigns` | `NewCampaignView` (modos) | `CampaignCreatorClient` · `/campaigns/new` |
| **Persona** | `/audiences/personas` | [`PersonaCreateModeSheet`](../src/components/audiences/PersonaCreateModeSheet.tsx) | [`PersonaCreatorUxPage`](../src/components/audiences/PersonaCreatorUxPage.tsx) · `/audiences/personas/create` |
| **Automação** | [`AutomationsRulesView`](../src/components/AutomationsRulesView.tsx) | [`AutomationCreateModeModal`](../src/components/automations/AutomationCreateModeModal.tsx) | [`AutomationRuleCreatorView`](../src/components/automations/AutomationRuleCreatorView.tsx) · `/automations/rules/new` |

## 7. Checklist para uma nova feature

- [ ] Tela-lista com `PageToolbar` + empty state; "Criar" abre o modal (ou o stepper, se sem modos).
- [ ] Tipos/templates/helpers num módulo compartilhado em `src/lib/<feature>/…` (sem duplicar na UI).
- [ ] Modal com `CreatorModalShell` + `CreationModeChoiceCard/Grid`; navega para a rota com query.
- [ ] Rota `…/new` com `layout.tsx` (`data-campaign-creator-shell`) + `page.tsx` (`Suspense`).
- [ ] View do stepper: header `PageTitleBlock` + `UxHorizontalStepper` + steps + sidebar/preview +
      `ui-wizard-nav`; salva na API, trata 402, volta à lista.
- [ ] Templates pré-preenchem via `?template=<id>`.
- [ ] Estado local para fluxos curtos; Context para fluxos grandes.
- [ ] Atualizar o README da feature e, se o padrão evoluir, este doc.
