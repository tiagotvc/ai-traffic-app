# Agency Brain — Architecture

Traffic IA product module. Accumulates client knowledge: learnings, hypotheses, suggestions, DNA, timeline, experiments, action plans, chat.

## Module map

| Module | Route | Phase | Feature flag |
|--------|-------|-------|--------------|
| Aprendizados | `/agency-brain/learnings` | 1 | `allowCreativeMemoryAi` |
| Hipóteses | `/agency-brain/hypotheses` | 1 | `allowAgencyBrainHypotheses` |
| Sugestões | `/agency-brain/suggestions` | 1 | `allowCreativeMemoryAi` |
| DNA | `/agency-brain/dna` | 1 | `allowAgencyBrainDna` |
| Timeline | `/agency-brain/timeline` | 2 | `allowAgencyBrainTimeline` |
| Laboratório | `/agency-brain/experiments` | 3 | `allowAgencyBrainExperiments` |
| Plano de ação | `/agency-brain/action-plans` | 4 | `allowAgencyBrainActionPlans` |
| Chat | `/agency-brain/chat` | 5 | `allowAgencyBrainChat` |

Types: `src/lib/agency-brain/domain/`

## Data model

- `client_learnings` — facts (approved = memory)
- `client_hypotheses` — unproven patterns
- `client_action_suggestions` — actionable items with priority + links
- `client_dna` — structured works/doesn't work per category
- `client_timeline_events` — aggregated events (Phase 2+)
- `client_experiments` — A/B tests (Phase 3+)
- `client_action_plans` + items (Phase 4+)
- `clients.niche` — market segment (Phase 6)

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
