# Visão do Labs

## O que é

Labs é um **Market Research Engine** premium: pesquisa profunda de mercado, análise competitiva, geração de hipóteses com evidências e construção de inteligência proprietária.

O usuário cria um experimento como:

> "Encontrar novas oportunidades para vender Minoxidil no Brasil"

Um **Orchestrator Agent** decide quais Scientists participam. O workflow roda em background (Inngest + Cloud Run) e pode levar **10 a 30+ minutos**. O objetivo não é velocidade de chat — é **qualidade do dossiê**.

## O que Labs **não** é

| Não somos | Por quê |
|-----------|---------|
| Chatbot | Resposta instantânea sem evidência |
| Gerador de copies soltas | Copy sem dados = alucinação |
| Sistema de teste A/B simples | A/B manual continua possível via campanhas; Labs **pesquisa** antes de testar |

## Filosofia

Construir um **cientista de marketing autônomo** que:

1. Pesquisa (web, concorrentes, consumidores, tendências)
2. Estrutura conhecimento (findings tipados, fontes)
3. Gera hipóteses (com evidências contadas)
4. Aprende (memórias de mercado, cliente, global)
5. Recomenda próximos passos acionáveis

## Fluxo mental

```txt
coleta → finding → evidence → hypothesis → confidence
```

**Nunca:** `prompt solto → hipótese inventada`.

## Posição no produto

- **Menu:** substitui "Laboratório" / Experimentos em `/agency-brain/experiments` → `/agency-brain/labs`
- **Agency Brain:** permanece como memória e resultados (hipóteses, aprendizados, DNA, timeline)
- **Dashboard principal:** permanece tempo real (Meta, GA4) — **independente** do Labs

## Diferencial estratégico

> Pesquisar profundamente o mercado, entender consumidores e concorrentes, gerar hipóteses com evidências e transformar tudo em inteligência acumulada no Agency Brain.

Metáfora de longo prazo:

```txt
Perplexity para marketing
+ Madgicx
+ cientista de crescimento autônomo
+ memória proprietária de mercado
```

## Regras de produto

1. Labs pode ser lento; dashboard não pode ser desatualizado
2. Cada Scientist é selecionável, com custo e tempo visíveis
3. Hipóteses exigem evidências rastreáveis
4. Conhecimento reutilizável persiste em memórias Labs + merge Agency Brain
5. Expansão **agente a agente** — arquitetura modular desde o MVP
