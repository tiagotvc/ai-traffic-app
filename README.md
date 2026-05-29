# ai-traffic-app

MVP da plataforma **Traffic AI** — gestão de tráfego pago com Meta Ads + IA (Gemini).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- **i18n**: `next-intl` — Português (BR) e English em todo o app
- PostgreSQL + **TypeORM**
- NextAuth (Facebook / Meta scopes `ads_read`, `ads_management`, `business_management`, `pages_show_list`)
- Gemini, PDF (pdf-lib), gráficos (recharts)
- Meta Ads: criação completa **Campaign → Ad Set → Creative → Ad** (inicia pausada)

## Pré-requisitos

- **Node.js 20+** instalado ([nodejs.org](https://nodejs.org/))
- **pnpm 9** (vem com o Node via Corepack — **não precisa de npm**)
- Docker (opcional, para Postgres local)

### Se aparecer erro em `npm.ps1` (execução de scripts desabilitada)

No PowerShell, o comando `npm` pode apontar para `npm.ps1`, que é bloqueado pela política de execução. **Não use `npm install -g pnpm`.** Use uma destas opções:

```powershell
# Opção 1: npm via .cmd (ignora o .ps1)
npm.cmd install -g pnpm

# Opção 2: pnpm já vem com o Node (Corepack) — sem npm
& "${env:ProgramFiles}\nodejs\node_modules\corepack\shims\pnpm.cmd" -v

# Opção 3: wrapper na pasta do projeto
cd "C:\Users\Tiago Carvalho\Documents\projetos\ai-traffic-app"
.\pnpm.ps1 install
```

Para liberar scripts só para o seu usuário (opcional):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### Se aparecer “npm não existe” ou “pnpm não é reconhecido”

O Node costuma estar em `C:\Program Files\nodejs`, mas essa pasta **não está no PATH**.

**Opção A — corrigir PATH (recomendado, uma vez):**

```powershell
cd "C:\Users\Tiago Carvalho\Documents\projetos\ai-traffic-app"
powershell -ExecutionPolicy Bypass -File .\scripts\fix-path-node.ps1
```

Feche e reabra o terminal. Teste: `node -v` e `pnpm -v`.

**Opção B — usar o wrapper na pasta do projeto (sem mudar PATH):**

```powershell
cd "C:\Users\Tiago Carvalho\Documents\projetos\ai-traffic-app"
.\pnpm.ps1 install
.\pnpm.ps1 dev
```

## Setup rápido

```powershell
# 1) Postgres
pnpm run db:up
copy .env.example .env
# Edite .env (NEXTAUTH_SECRET, META_*, GEMINI_*, DATABASE_URL)

# 2) Dependências e DB
pnpm install
pnpm run db:migrate

# 3) App
pnpm dev
```

(Se `pnpm` não funcionar, troque por `.\pnpm.ps1` nos comandos acima.)

Abra [http://localhost:3000/pt-BR](http://localhost:3000/pt-BR) ou `/en` → login com Facebook.

Troque o idioma no seletor da sidebar.

## Telas

| Rota | Descrição |
|------|-----------|
| `/{locale}/dashboard` | KPIs, gráfico, alertas, clientes |
| `/{locale}/command` | **Command Center** — todas campanhas, inbox, bulk pause |
| `/{locale}/clients` | Hub de clientes (contas Meta, metas) |
| `/{locale}/clients/[slug]` | Detalhe: metas, config Meta, públicos, lookalike |
| `/{locale}/clients/[slug]/campaigns/[id]` | Gerenciador: campanha → conjuntos → anúncios |
| `/{locale}/ai-center` | Sugestões Gemini + aplicar na Meta |
| `/{locale}/ads/new` | Criador — campanha completa na Meta |
| `/{locale}/reports` | PDF white-label + resumo WhatsApp |
| `/{locale}/settings` | White-label, conectar Meta, referência de variáveis |
| `/{locale}/settings/meta-assets` | Hub de ativos Meta (BMs, contas, páginas) |
| `/{locale}/onboarding/meta` | Pós-login Facebook — descoberta de Business Managers |

`locale` = `pt-BR` ou `en`

## APIs principais

- `POST /api/sync/run` — sincronizar métricas Meta → Postgres
- `GET /api/dashboard/summary` | `/api/dashboard/timeseries`
- `GET /api/clients` | `GET /api/clients/:id` | `PATCH /api/clients/:id/context`
- `GET/PATCH /api/clients/:id/meta-settings` — página, pixel, CTA, públicos, sync, tags
- `GET/POST /api/command-center/campaigns` | `bulk-actions` | `alerts`
- `GET/POST /api/clients/:id/lookalike` — criar lookalike
- `GET /api/meta/audiences?adAccountId=` — públicos (cache 30 min)
- `GET/POST /api/automation/rules` — regras auto-pausa
- `GET/POST /api/campaign-templates` | `/api/creative-assets`
- `POST /api/meta/discover` — importar BMs, contas e páginas (pós-login ou botão Atualizar)
- `GET /api/meta/businesses` — listar BMs com contagens
- `GET /api/meta/assets?businessId=` — contas/páginas filtradas por BM
- `GET /api/meta/ad-accounts?clientId=` — contas vinculadas ao cliente
- `POST /api/ai/recommendations` | `POST /api/ai/refine` | `POST /api/meta/apply`
- `POST /api/meta/campaigns` — criar campanha completa na Meta
- `POST /api/reports/pdf` | `POST /api/reports/whatsapp`
- `POST /api/seed/demo` — métricas demo (sem Meta)

## Sync agendado (produção)

- **Vercel Cron** ou GitHub Actions chamando `POST /api/sync/run` a cada 4–6h
- Dev local: `pnpm run sync:cron` (requer sessão autenticada via `CRON_SESSION_COOKIE`)
- Sync usa **fila por conta** (`sync_queue_jobs`) com delay entre chamadas Meta e cooldown de 10 min no botão manual
- Clientes com `syncEnabled: false` ou prioridade `critical` / `normal` / `low` em `client_meta_settings`

### Rate limits Meta

- Tier **Development** da Marketing API: ~600 insights + ~300 writes por ad account / hora (base)
- Tier **Full** (App Review): ordens de magnitude maior — necessário para 200+ contas
- O app lê headers `X-FB-Ads-Insights-Throttle` e faz backoff em erros 17 / 80000
- Variável opcional: `META_API_DELAY_MS=250` (pausa entre chamadas)

## O que fica na plataforma vs Meta externa

| Na Traffic AI (dia a dia) | Ainda na Meta (exceção) |
|---------------------------|-------------------------|
| Command Center, alertas, pausar/ativar, orçamento | Criar BM, billing, appeal política |
| Config por cliente, lookalike, públicos | Setup inicial pixel avançado |
| Criador + templates, sync, automação | Criativo vídeo muito complexo |

## Migration 0006 (Meta Business assets)

Rode `pnpm run db:migrate` após pull — cria `meta_businesses`, `meta_pages`, `meta_ad_account_inventory` e coluna `ad_accounts.meta_business_id`.

## Migration 0005

Rode `pnpm run db:migrate` após pull — cria `client_meta_settings`, fila de sync, `saved_views`, `automation_rules`, cache de públicos, etc.

## Publicar campanhas na Meta

Cada **cliente** pode ter sua própria **Página do Facebook** e **URL de destino** (site, landing page, WhatsApp, etc.). Isso evita usar uma única página global para todos os negócios.

### Login com Facebook (gestores)

1. **Entrar com Facebook** na tela de login (recomendado para gestores de tráfego).
2. Após OAuth, o app redireciona para `/onboarding/meta` e importa **todos os Business Managers** acessíveis, contas e páginas.
3. Vincule contas aos clientes em **Hub de clientes** → filtre por BM na tela do cliente.
4. Páginas vêm do cache importado — use **Configurações → Ativos Meta → Atualizar do Facebook** se a lista estiver vazia.

### Permissões Meta (App Dashboard)

Scopes OAuth usados pelo app:

- `ads_read`, `ads_management` — métricas e campanhas
- `business_management` — listar Business Managers e ativos por BM (**pode exigir App Review em produção**)
- `pages_show_list`, `pages_read_engagement` — listar páginas do Facebook

Em modo **Desenvolvimento**, adicione gestores como testadores do app. Documente os scopes em Facebook Login → Permissões.

### Configuração por cliente (recomendado)

1. Entre com Facebook ou reconecte em **Configurações** (mesmo OAuth, mesmos scopes).
2. No **Hub de clientes** (`/clients`), abra o cliente.
3. Na seção **Publicação na Meta**:
   - **Página Meta** — selecione na lista importada (não é necessário digitar ID manualmente).
   - **URL de destino** — link que o anúncio abre (ex.: `https://clinica.com.br` ou link do WhatsApp).
4. Salve. O indicador deve mostrar *Pronto para publicar*.
5. Use **Nova Campanha** no cliente ou **Criador de Anúncios** (`/ads/new`) — escolha o cliente no topo.

O criador de anúncios envia `clientId` (slug) em `POST /api/meta/campaigns`. Sem página + URL válidas, a API retorna `CLIENT_PUBLISH_CONFIG_REQUIRED`.

### Fallback no `.env` (opcional)

Se o cliente **não** tiver `metaPageId` / `metaLinkUrl` salvos no banco, o app usa (quando preenchidos):

- `META_PAGE_ID` — ID da página do Facebook
- `META_LINK_URL` — URL de destino padrão

Útil para um único negócio em dev; em produção com vários clientes, prefira sempre configurar no perfil do cliente.

```env
# .env.example — opcional, fallback global
META_PAGE_ID=""
META_LINK_URL="https://seusite.com.br"
```

Após alterar o `.env`, reinicie `pnpm dev`.

### Comportamento da publicação

- Cria **campanha → conjunto → criativo dinâmico → anúncio** na conta Meta escolhida.
- Tudo inicia **pausado** — revise no Meta Ads Manager antes de ativar.
- Migration `0004` adiciona as colunas `clients.meta_page_id` e `clients.meta_link_url` (`pnpm run db:migrate`).

## Observações MVP

- Sem `GEMINI_API_KEY`, a IA retorna exemplos mock.
- Sem login Meta, o dashboard carrega **dados demo** automaticamente.
- Traduções em `messages/pt-BR.json` e `messages/en.json`.
