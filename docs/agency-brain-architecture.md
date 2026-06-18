# Agency Brain — Architecture

Traffic IA product module. Accumulates client knowledge: learnings, hypotheses, suggestions, DNA, timeline, experiments, action plans, chat.

**Labs (Market Research Engine):** premium module that **replaces** the legacy Laboratório (manual A/B). Full spec: [labs/README.md](./labs/README.md).

## Module map

| Module | Route | Phase | Feature flag |
|--------|-------|-------|--------------|
| Aprendizados | `/agency-brain/learnings` | 1 | `allowCreativeMemoryAi` |
| Hipóteses | `/agency-brain/hypotheses` | 1 | `allowAgencyBrainHypotheses` |
| Sugestões | `/agency-brain/suggestions` | 1 | `allowCreativeMemoryAi` |
| DNA | `/agency-brain/dna` | 1 | `allowAgencyBrainDna` |
| Timeline | `/agency-brain/timeline` | 2 | `allowAgencyBrainTimeline` |
| **Labs** | `/agency-brain/labs` | 3 | `allowLabs` (evolve from `allowAgencyBrainExperiments`) |
| Laboratório (legacy) | `/agency-brain/experiments` | 3 | redirect → Labs |
| Plano de ação | `/agency-brain/action-plans` | 4 | `allowAgencyBrainActionPlans` |
| Chat | `/agency-brain/chat` | 5 | `allowAgencyBrainChat` |

Types: `src/lib/agency-brain/domain/`

## Data model

- `client_learnings` — facts (approved = memory)
- `client_hypotheses` — unproven patterns; enriched by Labs merge (`source: labs`)
- `client_action_suggestions` — actionable items with priority + links
- `client_dna` — structured works/doesn't work per category
- `client_timeline_events` — aggregated events (Phase 2+)
- `client_experiments` — **legacy** A/B tests; historical data retained
- `client_action_plans` + items (Phase 4+)
- `clients.niche` — market segment (Phase 6)

### Labs data (Supabase, separate store)

Persisted in Supabase `labs_*` tables — see [labs/03-data-model.md](./labs/03-data-model.md). Merge to Agency Brain via `agency.brain.merge`.

## Confidence score

Numeric 0–100 on learnings and hypotheses. Enum `confidence` derived:

- 80–100 HIGH
- 50–79 MEDIUM
- 0–49 LOW

Rules compute score from sample size, spend, delta %, campaign count.

## AI integration

- Gemini via `gemini.ts` with plan-based model chain
- Quota: `maxAiRequestsPerMonth` counting `CM_AI_*` action types
- Context: `getClientBrainContext()` + DNA + approved learnings + few-shot

## Navigation

Sidebar expandable group "Agency Brain" with submenus. Shared layout: client selector + AI quota bar.

Legacy redirect: `/creative-memory` → `/agency-brain/learnings`
