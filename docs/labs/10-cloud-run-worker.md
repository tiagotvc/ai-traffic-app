# Cloud Run Worker (`scientists-worker`)

Repositório dedicado: `C:\Users\Tiago Carvalho\Documents\projetos\scientists-worker`

Service name: **`traffic-ai-scientists-worker`**

Estado atual: repo vazio (git init). Scaffold na Fase 1.

## Responsabilidades

- Executar Scientists (`canRun` → `run` → `saveScientistResult`)
- Endpoints internos HTTP
- Handlers de nightly jobs
- Chamadas Gemini, scraping leve (fase 1: mock estruturado)

**Não faz:** auth de usuário, UI, Inngest webhook (fica no ai-traffic-app).

## Endpoints

### `POST /internal/labs/run-scientist`

```json
{
  "experimentId": "uuid",
  "scientistId": "competitor",
  "input": { "...ScientistInput" }
}
```

Response:

```json
{
  "ok": true,
  "result": { "...ScientistResult" }
}
```

### `POST /internal/labs/run-experiment-step`

Steps customizados do Orchestrator (fase 2+).

### `POST /internal/labs/nightly-job`

```json
{
  "jobId": "competitor.scan",
  "payload": { "niche": "skincare", "market": "BR" }
}
```

### `GET /health`

Liveness para Cloud Run.

## Autenticação

Header: `Authorization: Bearer ${SCIENTISTS_WORKER_API_KEY}`

- Rotacionável via GCP Secret Manager
- Apenas IPs/serviços confiáveis (Inngest cloud, Vercel) — considerar Cloud Run ingress internal + VPC connector futuro

## Deploy

```txt
scientists-worker/
  Dockerfile              # node:20-alpine, multi-stage
  cloudbuild.yaml         # build → push → deploy Cloud Run
  .env.example
```

Variáveis:

| Var | Uso |
|-----|-----|
| `SUPABASE_URL` | Persistência |
| `SUPABASE_SERVICE_ROLE_KEY` | Writes |
| `GEMINI_API_KEY` | LLM |
| `SCIENTISTS_WORKER_API_KEY` | Validação inbound |
| `PORT` | 8080 default |

## Escala

- Cloud Run: min instances 0 (MVP), max conforme carga
- Timeout: 15–30 min por request (config Cloud Run)
- Concurrency: 1 por instância para jobs pesados (ajustável)

## Estrutura alvo

```txt
src/
  index.ts
  routes/internal/labs.ts
  scientists/
    competitor-scientist/index.ts
    consumer-scientist/index.ts
    ...
  registry.ts
  orchestrator/finalize.ts
  db/supabase.ts
  lib/gemini.ts
  lib/save-scientist-result.ts
```

## Local dev

```bash
cd scientists-worker
pnpm install
pnpm dev          # tsx watch src/index.ts
```

Chamar com curl + API key; Inngest dev server no ai-traffic-app apontando para localhost via ngrok/tunnel.

## Observabilidade

- Structured logs (JSON) com `experimentId`, `scientistId`
- Métricas: duration_ms, credits_used, status
- Erros → `labs_agent_runs.errors` + Sentry (fase 1+)
