# Integração Agency Brain

Labs **substitui** o Laboratório A/B manual. **Complementa** hipóteses, aprendizados, DNA e timeline.

## Mapeamento conceitual

| Labs | Agency Brain (Postgres) |
|------|-------------------------|
| `labs_hypotheses` | `client_hypotheses` |
| findings tipo learning | `client_learnings` |
| padrões DNA | `client_dna` |
| evento concluído | `client_timeline_events` (fase 2) |
| sugestão acionável | `client_action_suggestions` (fase 2) |

Entidades existentes:

- [`ClientHypothesis`](../../src/db/entities/ClientHypothesis.ts)
- [`ClientExperiment`](../../src/db/entities/ClientExperiment.ts) — legado A/B; não deletar dados históricos
- [`brain-pipeline.ts`](../../src/lib/agency-brain/brain-pipeline.ts) — pipeline rápido pós-sync campanhas (independente do Labs)

## O que substituir

| Antes | Depois |
|-------|--------|
| Menu "Laboratório" | "Labs" |
| `/agency-brain/experiments` | `/agency-brain/labs` (+ redirect) |
| Registro manual A/B | Dossiê de pesquisa + hipóteses com evidência |
| `allowAgencyBrainExperiments` | `allowLabs` |

Experiments legados: manter leitura; sem novos registros via UI antiga.

## Merge: `agency.brain.merge`

Job disparado ao `labs/experiment.completed` (opcional no MVP; manual via botão "Salvar no Agency Brain").

```txt
Para cada labs_hypothesis com confidence >= threshold:
  → INSERT/UPDATE client_hypotheses
     - source: "labs"
     - labs_hypothesis_id
     - confidence score 0-100
     - evidence summary

Findings aprovados pelo usuário:
  → client_learnings (approved = true)

Oportunidades top:
  → client_action_suggestions (priority, links)
```

Campos sugeridos em `client_hypotheses` (migration futura):

- `labs_experiment_id` uuid nullable
- `labs_hypothesis_id` uuid nullable
- `evidence_json` jsonb nullable

## Confidence

Agency Brain usa score 0–100 e enum HIGH/MEDIUM/LOW.

Labs `confidence` (0–1) mapeia:

- ≥ 0.80 → HIGH (80–100)
- ≥ 0.50 → MEDIUM (50–79)
- < 0.50 → LOW

Derivado do **Confidence Scientist** — nunca manual no merge.

## brain-pipeline vs Labs

| | brain-pipeline | Labs |
|--|----------------|------|
| Trigger | Sync campanhas | Experimento usuário |
| Duração | Segundos | 10–30 min |
| Fonte | Dados conta Meta | Mercado externo + conta |
| Output | Hipóteses operacionais | Dossiê estratégico |

Ambos alimentam `client_hypotheses`; usuário distingue por `source`.

## Nav e módulos

Atualizar [`modules.ts`](../../src/lib/agency-brain/domain/modules.ts):

- Remover ou deprecar `experiments`
- Adicionar `labs` com flag `allowLabs`

## UI pós-dossiê

Botões no dossiê:

- **Salvar hipóteses no Agency Brain** → merge
- **Criar campanha** (futuro, link campanhas)
- **Gerar criativos** (futuro, Fal.ai)
