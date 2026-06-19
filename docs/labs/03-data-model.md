# Modelo de dados (Supabase)

Labs persiste no **Supabase**. Prefixo de tabelas: `labs_*`.

Agency Brain (Postgres/TypeORM) recebe merge seletivo — ver [08-agency-brain-integration.md](./08-agency-brain-integration.md).

## Tabelas principais

### `labs_experiments`

Experimento / pesquisa criada pelo usuário.

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | uuid PK | |
| `workspace_id` | uuid | |
| `user_id` | uuid | criador |
| `client_id` | uuid nullable | vínculo Agency Brain |
| `name` | text | |
| `product` | text | |
| `niche` | text nullable | |
| `market` | text nullable | |
| `country` | text nullable | |
| `language` | text nullable | |
| `objective` | text nullable | |
| `competitors` | jsonb | string[] |
| `website_url` | text nullable | |
| `selected_scientists` | jsonb | string[] |
| `selected_sources` | jsonb nullable | |
| `status` | text | ver lifecycle |
| `estimated_credits` | int | |
| `credits_used` | int default 0 | |
| `max_credits` | int nullable | |
| `max_duration_minutes` | int nullable | |
| `dossier` | jsonb nullable | resultado consolidado |
| `error_message` | text nullable | |
| `created_at` | timestamptz | |
| `started_at` | timestamptz nullable | |
| `completed_at` | timestamptz nullable | |

Índices: `(workspace_id, created_at desc)`, `(status)`.

### `labs_agent_runs`

Uma execução de um Scientist no experimento.

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `experiment_id` | uuid FK |
| `scientist_id` | text |
| `status` | text | `pending`, `running`, `success`, `partial`, `failed` |
| `summary` | text nullable |
| `credits_used` | int |
| `duration_ms` | int nullable |
| `errors` | jsonb nullable |
| `started_at` | timestamptz |
| `completed_at` | timestamptz nullable |

### `labs_findings`

Findings tipados produzidos pelos Scientists.

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `experiment_id` | uuid FK |
| `agent_run_id` | uuid FK nullable |
| `scientist_id` | text |
| `type` | text | hook, pain, desire, objection, offer, trend, … |
| `value` | text |
| `summary` | text nullable |
| `confidence` | numeric nullable |
| `evidence_count` | int nullable |
| `metadata` | jsonb nullable |
| `created_at` | timestamptz |

### `labs_sources`

Fonte bruta ou referência citada.

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `experiment_id` | uuid FK |
| `agent_run_id` | uuid FK nullable |
| `source_type` | text | meta_ad_library, reddit, google_trends, … |
| `url` | text nullable |
| `title` | text nullable |
| `snippet` | text nullable |
| `raw_payload` | jsonb nullable |
| `collected_at` | timestamptz |

### `labs_hypotheses`

Hipóteses geradas (positivas).

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `experiment_id` | uuid FK |
| `name` | text |
| `description` | text |
| `confidence` | numeric |
| `market_evidence` | numeric nullable |
| `client_evidence` | numeric nullable |
| `competitor_evidence` | numeric nullable |
| `trend_evidence` | numeric nullable |
| `cost` | text nullable | low/medium/high |
| `effort` | text nullable |
| `risk` | text nullable |
| `expected_impact` | text nullable |
| `recommended_next_step` | text nullable |
| `rank` | int nullable |
| `merged_to_brain` | boolean default false |
| `created_at` | timestamptz |

### `labs_hypothesis_evidence`

Liga finding → hipótese.

| Coluna | Tipo |
|--------|------|
| `hypothesis_id` | uuid FK |
| `finding_id` | uuid FK |
| `weight` | numeric nullable |

### `labs_negative_hypotheses`

Anti-hipóteses ("o que evitar").

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `experiment_id` | uuid FK |
| `statement` | text |
| `reasons` | jsonb |
| `confidence` | numeric nullable |

### `labs_credits_usage`

Ledger de créditos.

| Coluna | Tipo |
|--------|------|
| `id` | uuid PK |
| `workspace_id` | uuid |
| `experiment_id` | uuid FK nullable |
| `scientist_id` | text nullable |
| `credits` | int |
| `created_at` | timestamptz |

### Memórias (fase 2+)

| Tabela | Escopo |
|--------|--------|
| `labs_market_memories` | Nicho/produto/mercado |
| `labs_client_memories` | Por cliente |
| `labs_global_patterns` | Agregado anonimizado |

### Grafo (fase 3+)

| Tabela | Uso |
|--------|-----|
| `labs_knowledge_nodes` | Entidades |
| `labs_knowledge_edges` | Relações |

### Operacional (fase 3+)

| Tabela | Uso |
|--------|-----|
| `labs_nightly_jobs` | Log de jobs noturnos |
| `labs_research_tasks` | Recursive research |
| `labs_simulations` | Simulation / Monte Carlo |
| `labs_agent_votes` | Debate Engine |

## RLS

- Políticas por `workspace_id` em todas as tabelas user-facing
- Service role no worker para writes durante execução (com validação de experiment ownership no worker)

## Migrations

Fase 1: SQL migrations no projeto Supabase ou pasta `supabase/migrations/` no ai-traffic-app (a definir na implementação).
