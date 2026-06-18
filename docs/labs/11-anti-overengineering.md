# Anti-overengineering

Objetivo Fase 1: **fundação modular** que permite adicionar Scientists sem refatorar infra.

## Não criar agora

| Item | Por quê |
|------|---------|
| Microserviço por Scientist | Um módulo TS basta até deps incompatíveis |
| Kafka / RabbitMQ | Inngest já orquestra |
| Kubernetes | Cloud Run gerenciado |
| GraphRAG completo | Fase 4; texto + findings bastam no MVP |
| Monte Carlo real | Simulation mock; 1000 runs depois |
| Vision pipeline pesado | Vision Scientist fase 3 |
| Browser farm / Playwright em escala | Scraping mock → API oficial primeiro |
| Scientist Factory automático | Fase 4 |
| Pacote npm compartilhado | Copiar tipos no MVP (Opção A) |
| Supabase + Postgres unificados | Dual DB com merge é OK no curto prazo |

## Criar agora (MVP)

- Interface `Scientist` + registry
- Um Cloud Run service
- Supabase `labs_*` core tables
- Inngest workflow linear
- UI dossiê + progresso
- 5 Scientists + Orchestrator (mock OK nos executáveis)

## Quando separar worker adicional

Sinais:

- Dependência Python ou CUDA
- Timeout recorrente > Cloud Run max
- Headless browser obrigatório em produção
- Isolamento de memória (visão, vídeo)

Até lá: **um repo, um service, módulos internos**.

## Regra de evidência > complexidade

Preferir:

```txt
finding estruturado + contagem de fontes
```

Sobre:

```txt
LLM longo sem grounding
```

## Regra de PR

Se o PR adiciona infra nova, deve responder:

1. Qual Scientist existente não consegue rodar sem isso?
2. Por que Inngest + Cloud Run não bastam?

Se não houver resposta clara → adiar.
