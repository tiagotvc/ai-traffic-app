# Infraestrutura & Vercel — auditoria, performance e gaps

> Auditoria de arquitetura/infra (2026-06-30), focada em uso da Vercel (caching, cron, runtime,
> conexões de DB) e segurança de auth. Fonte de verdade desta área. Atualize a cada mudança em
> caching, cron ou runtime config.

## TL;DR — está pronto?

**O núcleo funcional está sólido. O gap operacional crítico (crons de produção sem nenhum disparo
configurado) foi corrigido em 2026-06-30** — falta só validar em produção (plano Pro + `CRON_SECRET`).
Segue faltando adotar caching do Next 15 (`'use cache'`, `revalidate`, tags) — hoje praticamente
tudo é dynamic SSR sem cache, o que infla custo de função/DB/Meta API sem necessidade.

## Arquitetura / arquivos

| Área | Arquivo |
|---|---|
| DB pool (serverless) | `src/db/pg-config.ts`, `src/db/data-source.ts` |
| Cron — reconciliação de billing | `src/app/api/cron/billing-reconcile/route.ts` |
| Cron — worker de billing | `src/app/api/cron/billing-worker/route.ts` |
| Cron — backfill histórico | `src/app/api/cron/historical-backfill/route.ts` |
| Cron — envio de relatórios agendados | `src/app/api/cron/report-schedules/route.ts` |
| Sync local (dev only) | `scripts/sync-cron.ts` → `/api/sync/run` |
| Redis (cache/feature flags/entitlements) | `src/lib/redis-cache.ts` |
| Pipeline de pesquisa (AI Scientists) | `src/app/api/labs/pipeline/stream/route.ts`, `src/lib/labs/pipelines/runner.ts` |
| Inngest | `src/app/api/inngest/route.ts`, `src/lib/inngest/functions/run-labs-experiment.ts` |
| Auth / sessão | `src/auth.config.ts`, `src/auth.ts`, `src/middleware.ts` |

## Checklist do que foi auditado

| Pergunta | Resposta |
|---|---|
| Os crons de produção disparam sozinhos? | ✅ **Corrigido** — `vercel.json` na raiz define `crons: []` para os 4 endpoints. Antes: nenhum `vercel.json`; `scripts/sync-cron.ts` era só dev local e chamava `/api/sync/run`, uma rota diferente. |
| Os endpoints de cron aceitam `GET`? | ✅ **Corrigido** — Vercel Cron só invoca via `GET`; os 4 endpoints só tinham `POST`. Adicionado `export const GET = POST;` em cada um. |
| `billing-reconcile`, `billing-worker`, `historical-backfill` têm `maxDuration`? | ✅ Sim, `maxDuration = 60` nos três. |
| `report-schedules` tem `maxDuration`? | ✅ **Corrigido** — `maxDuration = 120` adicionado. |
| Crons têm autenticação? | ✅ Todos checam `CRON_SECRET` via header (`authorizeCron`/`authCron`). |
| `'use cache'` / `unstable_cache` / `revalidateTag` / ISR são usados? | ❌ Zero ocorrências no codebase. ~520 `fetch()` no projeto, só ~6% com alguma opção de cache. |
| Pool de DB está ajustado pra serverless? | 🟡 `pg-config.ts` seta `max: 1` quando `process.env.VERCEL` existe — correto **se** `DATABASE_URL` apontar pro pooler do Supabase (porta 6543, `pgbouncer=true`). Não há checagem que force isso; vale confirmar manualmente na env da Vercel. |
| Rotas de dashboard/relatórios têm `dynamic`/`revalidate` explícito? | ❌ 72 de 73 rotas não declaram nada — comportamento dynamic SSR por default, sem intenção explícita. |
| `labs/pipeline/stream` (research/AI Scientists) tem `maxDuration`? | ❌ Não — streaming SSE de uma pipeline com latência de inferência não-limitada rodando sob o default de 10s. |

## Segurança (auth) — já corrigido

✅ **Fix aplicado em 2026-06-30** ([`src/auth.config.ts`](../../src/auth.config.ts)): o branch legado
do provider `"facebook"` (não confundir com o provider ativo `"facebook-login"`,
[`meta-facebook-login-provider.ts`](../../src/lib/meta-facebook-login-provider.ts)) gravava o
access token da Meta em texto puro no JWT e o `session()` callback republicava esse token —
junto de `expiresAt`/`tokenType`/`scopes` — em `session.meta`, exposto via `GET /api/auth/session`
e `useSession()` no browser. Confirmado que nenhum código (cliente ou servidor) lia esse campo —
`getAppContext()` resolve o token real via `meta_auth` (`resolveWorkspaceMetaAccessToken`), não via
sessão. Branch morto removido; `session.meta` hoje só expõe `profileId`.

⚠️ **Pendente:** rotação de `AUTH_SECRET`/`NEXTAUTH_SECRET` na Vercel para invalidar sessões JWT
antigas que possam ainda carregar o token legado (a remoção do código não invalida cookies já
emitidos). Desloga todos os usuários — agendar para uma janela de deploy.

## Gaps / melhorias recomendadas (priorizado)

### 🔴 Crons — ✅ **FEITO** (2026-06-30)

1. ✅ **`vercel.json`** criado na raiz com `crons: []` para os 4 endpoints. `billing-worker` e
   `report-schedules` de hora em hora (`0 * * * *`); `billing-reconcile` e `historical-backfill`
   diários (`03:00`/`04:00` UTC). **Requer plano Vercel Pro** — Hobby só permite cron 1x/dia.
   Ajustar frequência conforme necessidade real de negócio.
2. ✅ **Gap adicional descoberto ao implementar:** os 4 endpoints só tinham handler `POST`, mas
   **Vercel Cron sempre invoca via `GET`** — `vercel.json` sozinho teria resultado em `405` em
   toda execução. Adicionado `export const GET = POST;` nos 4 (mantendo `POST` pra disparo manual/
   interno).
3. ✅ **`export const maxDuration = 120;`** adicionado em `report-schedules/route.ts` (antes sem
   nenhum `maxDuration`, caía no default de 10s da plataforma).
4. ⚠️ **Pendente de validar em produção:** confirmar no dashboard da Vercel (Project → Cron Jobs)
   que as 4 execuções aparecem e retornam `200`; `CRON_SECRET` precisa estar setado no ambiente de
   produção (Vercel injeta `Authorization: Bearer $CRON_SECRET` automaticamente quando a env var
   existe — sem ela, `authorizeCron`/`authCron` recusam a chamada).

### 🟡 Caching (Vercel Data Cache / ISR)

4. Adicionar `revalidate`/cache tags nas rotas de leitura pesada (`/api/dashboard/*`,
   `/api/zones/insights`, `/api/audiences/flags`) — maior redução de custo/latência por esforço.
5. Mover fetch de dados do dashboard de client components pra server components (hoje
   `DashboardAppsHome.tsx`/`DashboardContentLive.tsx` refetcham via `/api/*` no client, criando
   waterfall e bypassando o Data Cache).
6. Confirmar `DATABASE_URL` na Vercel usa o pooler do Supabase (porta 6543, `pgbouncer=true`).

### 🟢 Runtime / bundle

7. `maxDuration` em `labs/pipeline/stream` (pesquisa AI Scientists).
8. Dynamic import de `pdf-lib` em `src/lib/export/campaign-table-pdf.ts` (hoje top-level, vai pro
   bundle do client mesmo sem o usuário exportar).

## Histórico

- 2026-06-30: Auditoria inicial completa (arquitetura, caching, cron, AI, billing/multi-tenant,
  bundle, segurança). Fix de segurança em `auth.config.ts` aplicado no mesmo dia.
- 2026-06-30: Gap de cron corrigido — `vercel.json` criado, handlers `GET` adicionados aos 4
  endpoints (Vercel Cron só dispara via GET), `maxDuration` adicionado em `report-schedules`.
  Falta validar execução real em produção (requer plano Pro + `CRON_SECRET` setado).
