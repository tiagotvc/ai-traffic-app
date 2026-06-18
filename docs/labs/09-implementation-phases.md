# Fases de implementação

## Fase 0 — Documentação viva ✓ (este repo)

- Árvore `docs/labs/` completa
- MVP Scientists documentados
- Stubs dos demais 49
- `agency-brain-architecture.md` atualizado

## Fase 1 — MVP (fundação técnica)

### scientists-worker

1. Scaffold Node.js + Fastify/Express + Dockerfile + Cloud Run
2. Interface `Scientist` + registry + `saveScientistResult`
3. Scientists: competitor, consumer, trend, hypothesis, confidence (mock/parcial OK nos executáveis)
4. Endpoints `/internal/labs/run-scientist`, `/internal/labs/nightly-job`
5. Client Supabase

### ai-traffic-app

6. Inngest + `labs/experiment.created`
7. APIs `/api/labs/*`
8. UI: criar, progresso, dossiê
9. Créditos estimados/consumidos
10. Nav Labs substituindo Experimentos
11. Env: `SCIENTISTS_WORKER_URL`, `SCIENTISTS_WORKER_API_KEY`

**Critério de done:** experimento end-to-end com dossiê JSON mock realista.

## Fase 2 — Pro

Scientists: Creative, Offer, Psychology, Statistical, Contradiction, Winner, Failure, Anti-Hypothesis.

Features: evidências visíveis por hipótese, anti-hipóteses no dossiê, merge Agency Brain automático.

## Fase 3 — Premium

Vision, Simulation, Debate, Knowledge Graph, Memory Compression, nightly jobs, Market Memory, Client DNA enrichment.

## Fase 4 — Advanced Intelligence

Dream Cycle, Recursive Research, Weak Signal (se não em 3), Monte Carlo, Darwin, Meta Scientist, GraphRAG, Scientist Factory, World Model.

## Contrato de expansão por Scientist

Cada novo Scientist exige:

1. `docs/labs/agents/<id>.md` completo
2. Módulo em `scientists-worker/src/scientists/<id>/`
3. Entrada em `registry.ts`
4. Créditos em `07-billing-and-quotas.md`
5. Testes mínimos (`canRun`, `run` smoke)
6. Atualizar `agents/README.md` status → `implemented`

## Ordem sugerida pós-MVP

```txt
Pro: offer → creative → statistical → contradiction → winner → failure → antiHypothesis
Premium: saturation → opportunityGap → weakSignal → simulation → debate → vision
Advanced: dream → recursive → meta → darwin → graphRAG
```
