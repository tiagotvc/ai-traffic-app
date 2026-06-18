# Client campaigns (Meta interno)

| Campo | Valor |
|-------|-------|
| **source_type** | `client_meta` |
| **Scientists** | winner, failure, confidence, contradiction |
| **Fase** | 2 |

## Dados coletados

- Campanhas, criativos, métricas históricas (CTR, CPA, ROAS)
- Snapshot no momento do experimento — não substitui dashboard tempo real

## Implementação

API Meta já usada no Traffic AI; worker recebe snapshot via input ou fetch interno autenticado.
