# Conta de demonstração (workspace demo)

> Fonte de verdade da conta usada para gravar vídeos e fazer demonstrações comerciais.
> Nenhum dado de cliente real aparece aqui: tudo é gerado por script.

## O que existe

9 clientes fictícios no workspace demo, cada um com conta de anúncio `act_demo_*`,
3 campanhas, 2 conjuntos por campanha e 2 a 3 anúncios por conjunto, com 210 dias
(7 meses) de histórico diário terminando ontem.

| Cliente | Conta | Tipos de campanha | Gasto (30 dias) |
| --- | --- | --- | --- |
| Doutor A (Clínica de Estética) | `act_demo_doutor_a` | lead_site, lead_whatsapp | ~R$ 6,0 mil |
| Cliente B (Clínica de Estética) | `act_demo_cliente_b` | lead_site, lead_whatsapp | ~R$ 3,8 mil |
| Cliente C (Climatização e Ar Condicionado) | `act_demo_cliente_c` | lead_whatsapp, lead_site, sales | ~R$ 13,0 mil |
| Cliente D (Academia em Rede) | `act_demo_cliente_d` | lead_site, reach | ~R$ 11,5 mil |
| Cliente E (Odontologia e Implantes) | `act_demo_cliente_e` | lead_site, lead_whatsapp | ~R$ 10,8 mil |
| Cliente F (Imobiliária de Lançamentos) | `act_demo_cliente_f` | lead_site, lead_whatsapp, reach | ~R$ 10,6 mil |
| Cliente G (E-commerce de Moda) | `act_demo_cliente_g` | sales | ~R$ 14,9 mil |
| Cliente H (Pet Shop e Veterinária) | `act_demo_cliente_h` | lead_whatsapp, lead_site, sales | ~R$ 5,0 mil |
| Cliente I (Curso Online de Idiomas) | `act_demo_cliente_i` | lead_site, sales, reach | ~R$ 16,9 mil |

## Qual conta usar em cada demonstração

- **Ranking de criativos** → **Cliente G (E-commerce de Moda)**. É o único com 10 criativos
  num único grupo (Vendas), ordenados por ROAS de ~8,2 a ~2,9, com vencedor claro
  (remarketing de carrinho) e perdedor claro (frete grátis estático). Alternativa com
  história de CPA em vez de ROAS: **Cliente D (Academia em Rede)**, 5 criativos no grupo
  lead_site mais 3 no grupo de alcance.
- **Relatório do cliente (PDF)** → **Cliente D (Academia em Rede)**. Tem 3 campanhas,
  curva de crescimento visível (a campanha de inauguração começa no meio da janela e
  cresce 2,8x), dois tipos de campanha diferentes e o Cérebro da agência completo.

## Como regenerar

```bash
# 1. clientes, campanhas, conjuntos, anúncios e métricas (7 meses)
node scripts/seed-demo-agency-clients.mjs

# 2. previews dos criativos (SVG em public/demo-creatives/)
node scripts/generate-demo-creative-images.mjs

# 3. Cérebro da agência: aprendizados, hipóteses, sugestões, DNA, alertas, histórico
node scripts/seed-demo-agency-brain.mjs
```

Flags úteis:

- `--tenant=<uuid>` força o workspace. Sem a flag, o script descobre sozinho qual tenant
  tem contas `act_demo_*` (e aborta se houver mais de um).
- `--dry-run` (script 1) mostra o plano sem escrever nada.
- `--end=YYYY-MM-DD` (script 1) fixa o último dia da janela. O padrão é ontem, então
  rodar de novo é o que mantém os dados recentes.
- `--force` (script 3) regrava o conteúdo de quem já tem. Sem a flag, clientes que já
  possuem aprendizados são pulados.

### O que o script 1 apaga

Antes de gerar, ele **remove todas as linhas de `metric_snapshots`,
`campaign_metric_snapshots` e `ad_metric_snapshots` das contas demo** (as três tabelas
precisam ser reconstruídas juntas, senão conta, campanha e anúncio deixam de fechar
entre si). O escopo é restrito às contas cujo `metaAdAccountId` contém `demo` dentro do
tenant alvo. Contas reais não são tocadas.

## Por que existe código de demo na aplicação

O ranking de criativos e o bloco de criativos do relatório normalmente vêm **ao vivo da
Graph API da Meta**. Como `act_demo_*` não existe na Meta, essas telas voltariam vazias
por mais dados que o banco tivesse. Então:

- [`src/lib/demo-creatives.ts`](../../src/lib/demo-creatives.ts) monta `ads` + `insights`
  no mesmo formato da Meta a partir de `ad_metric_snapshots`.
- [`src/lib/creatives-access.ts`](../../src/lib/creatives-access.ts) desvia para esse
  caminho quando a conta é demo, antes de qualquer chamada à Meta.
- [`src/lib/report-breakdown-data.ts`](../../src/lib/report-breakdown-data.ts) gera os
  recortes de gênero, idade e dispositivo a partir dos totais do período.
- As guardas de "Meta não conectada" em
  [`/api/creatives/performance`](../../src/app/api/creatives/performance/route.ts) e em
  [`report-creatives-performance.ts`](../../src/lib/report-creatives-performance.ts)
  liberam passagem quando o workspace só tem contas demo.

Tudo isso é acionado por `isDemoAdAccountId()`, que exige `demo` no id da conta. Uma
conta real nunca entra nesses caminhos.

### Workspace sem Meta conectada

O dashboard decidia entre mostrar os dados e pedir para conectar a Meta olhando só se
existia token em `meta_auth`, sem considerar se havia dado no banco. O workspace demo
nunca vai ter token, porque não existe conta real para conectar, então ele ficava preso
no aviso mesmo com sete meses de histórico gravado.

[`isDemoWorkspace()`](../../src/lib/demo-data.ts) resolve: um workspace em que **todas**
as contas de anúncio são `act_demo_*` é reportado como conectado por
[`/api/settings/meta`](../../src/app/api/settings/meta/route.ts), que é a fonte do flag
`metaConnected` lido em
[`useDashboardData`](../../src/uxpilot-ui/adapters/useDashboardData.ts). Isso cobre de uma
vez o dashboard, o canvas editável, a home de visões e o dashboard de destaques, porque
todos consomem o mesmo hook.

A exigência de que *todas* as contas sejam demo é proposital. Um cliente real que tenha
uma conta de teste sobrando continua vendo o aviso, que para ele é a informação correta.

O botão "Sincronizar Meta" fica escondido no workspace demo: as contas não existem lá,
então sincronizar só devolveria erro na tela.

### Previews dos criativos

Os cards mostram um SVG gerado em `public/demo-creatives/<slug-do-nome>.svg`. O nome do
arquivo sai do nome do anúncio, então criar um criativo novo no script 1 e rodar o
script 2 já resolve o preview. Arquivos `.svg` ficam fora do matcher do middleware, o
que faz eles carregarem tanto na tela quanto dentro do PDF gerado pelo Puppeteer.

## Limites conhecidos

- `client_meta_settings.syncEnabled` fica `false` nas contas demo de propósito: elas não
  existem na Meta e não podem entrar no cron de sincronização.
- Se o workspace demo tiver um token Meta conectado, a geração do relatório tenta um
  refresh na Meta, falha para `act_demo_*` e segue com os dados do banco. O relatório sai
  normal, mas pode aparecer o aviso de dados não atualizados.
- O preview do anúncio dentro do modal de criativo (aba "Anúncio") depende de um id real
  da Meta e continua indisponível em conta demo.
