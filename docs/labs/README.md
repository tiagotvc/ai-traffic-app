# Labs — Documentação viva

Documentação modular do **Labs** (Market Research Engine premium) do Traffic AI.

Labs substitui o **Laboratório** (A/B manual) no Agency Brain por pesquisa profunda de mercado, geração de hipóteses com evidências e dossiê estruturado (10–30+ min em background).

## Índice

| Doc | Tema |
|-----|------|
| [00-vision.md](./00-vision.md) | Visão, filosofia, o que Labs não é |
| [01-product-positioning.md](./01-product-positioning.md) | Posicionamento, tiers, diferencial |
| [02-architecture.md](./02-architecture.md) | Dois repos, Vercel, Supabase, Inngest, Cloud Run |
| [03-data-model.md](./03-data-model.md) | Schema Supabase `labs_*` |
| [04-inngest-events.md](./04-inngest-events.md) | Eventos `labs/*` e workflows |
| [05-experiment-lifecycle.md](./05-experiment-lifecycle.md) | Estados, criação, dossiê JSON |
| [06-memory-system.md](./06-memory-system.md) | Market, Client, Global, Episodic, Semantic |
| [07-billing-and-quotas.md](./07-billing-and-quotas.md) | Créditos, planos, feature flags |
| [08-agency-brain-integration.md](./08-agency-brain-integration.md) | Merge Labs → Agency Brain |
| [09-implementation-phases.md](./09-implementation-phases.md) | Fases 0–4 |
| [10-cloud-run-worker.md](./10-cloud-run-worker.md) | Repo `scientists-worker`, endpoints, deploy |
| [11-anti-overengineering.md](./11-anti-overengineering.md) | O que **não** criar agora |

### Catálogos

| Pasta | Conteúdo |
|-------|----------|
| [agents/](./agents/) | 55 Scientists/Engines — um `.md` por agente |
| [sources/](./sources/) | Fontes de dados externas e internas |
| [nightly-jobs/](./nightly-jobs/) | Jobs noturnos via Inngest |

## Repositórios

| Repo | Path | Deploy |
|------|------|--------|
| **ai-traffic-app** | `C:\Users\Tiago Carvalho\Documents\projetos\ai-traffic-app` | Vercel |
| **scientists-worker** | `C:\Users\Tiago Carvalho\Documents\projetos\scientists-worker` | Google Cloud Run |

## Regras de manutenção

1. **Todo PR** que adiciona ou altera um Scientist deve atualizar:
   - `agents/<id>.md`
   - `agents/README.md` (status e fase)
   - Se aplicável: `03-data-model.md`, `04-inngest-events.md`, `07-billing-and-quotas.md`
2. **Status por agente:** `planned` | `partial` | `implemented` | `deprecated`
3. **Evidência obrigatória:** hipóteses sem contagem de evidências não persistem (ver [00-vision.md](./00-vision.md)).
4. **Scientist ≠ microserviço:** um módulo TS no worker até haver motivo real para separar (ver [11-anti-overengineering.md](./11-anti-overengineering.md)).
5. **Tipos compartilhados:** `ScientistInput` / `ScientistResult` espelhados entre repos no MVP; checklist no PR de ambos.

## Template de agente

Copiar [agents/_template.md](./agents/_template.md) ao documentar um novo Scientist.

## Relacionados

- [Agency Brain — Architecture](../agency-brain-architecture.md)
- Plano interno: `labs_living_documentation_331c59e9.plan.md`
