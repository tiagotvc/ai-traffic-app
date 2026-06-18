# Ciclo de vida do experimento

## Estados

```txt
draft
  → queued          (usuário clicou "Iniciar")
  → running         (Inngest pegou o evento)
  → collecting_data (executáveis rodando)
  → analyzing       (consolidação)
  → generating_hypotheses
  → calculating_confidence
  → finalizing      (dossiê JSON)
  → completed | failed | cancelled
```

MVP pode colapsar sub-estados em `running` até a UI Pro.

## Fluxo de criação

1. Usuário preenche brief (produto, nicho, mercado, objetivo, concorrentes)
2. Seleciona Scientists (cards com crédito/tempo)
3. Define `maxCredits` e opcionalmente `maxDurationMinutes`
4. App calcula `estimatedCredits` e valida saldo
5. INSERT `labs_experiments` status `queued`
6. `inngest.send("labs/experiment.created", { experimentId })`
7. Redirect para tela de progresso

## Progresso na UI

Exemplo:

```txt
Competitor Scientist     ✓ 126 anúncios analisados
Consumer Scientist       ✓ 2.143 reviews processadas
Trend Scientist          ✓ Google Trends e TikTok analisados
Hypothesis Scientist     Gerando hipóteses...
Confidence Scientist     Aguardando
```

Fonte: poll `labs_agent_runs` + Supabase Realtime (opcional).

## Dossiê JSON (`labs_experiments.dossier`)

Estrutura alvo:

```json
{
  "executiveSummary": {
    "researched": "Minoxidil no Brasil",
    "sourcesUsed": 312,
    "durationMinutes": 18,
    "scientistsUsed": ["competitor", "consumer", "trend", "hypothesis", "confidence"],
    "creditsUsed": 40,
    "dataQuality": "high"
  },
  "opportunities": [
    "UGC feminino vertical",
    "Garantia de 90 dias",
    "Autoridade médica"
  ],
  "hypotheses": [
    {
      "name": "UGC feminino vertical com demonstração",
      "description": "...",
      "confidence": 0.89,
      "marketEvidence": 0.91,
      "clientEvidence": 0.74,
      "trendEvidence": 0.86,
      "competitorEvidence": 0.88,
      "cost": "medium",
      "effort": "medium",
      "risk": "low",
      "expectedImpact": "high",
      "sources": {
        "adsAnalyzed": 84,
        "reviewsAnalyzed": 220,
        "videosAnalyzed": 31,
        "clientCampaignsUsed": 12
      },
      "recommendedNextStep": "Criar 3 variações de UGC..."
    }
  ],
  "negativeHypotheses": [
    { "statement": "Evitar carrossel neste momento", "reasons": ["..."] }
  ],
  "contradictions": [],
  "suggestedHooks": [],
  "suggestedCopies": [],
  "suggestedOffers": [],
  "recommendedExperiments": [],
  "brainMergeStatus": "pending"
}
```

## Cancelamento

- Usuário cancela → status `cancelled`; Inngest cancellation (se suportado) ou flag checked no worker
- Créditos já consumidos não revertem no MVP

## Falha

- Scientist individual: `partial` no run; experimento pode continuar
- Falha fatal: status `failed`, `error_message` preenchido
