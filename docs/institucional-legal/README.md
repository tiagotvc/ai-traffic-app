# Institucional & Legal (Central de Ajuda, Sobre, Termos, Privacidade, Exclusão de Dados)

> Rotas (in-app, abrem dentro do shell do app): `/legal/support`, `/legal/about`, `/legal/terms`,
> `/legal/privacy`, `/legal/data-deletion`.
> Rotas públicas (sem login, grupo `(legal)`): `/{locale}/privacy`, `/{locale}/terms`, `/{locale}/data-deletion`.
> Acesso in-app: menu do usuário (rodapé do sidebar) → Suporte / Sobre / Termos / Privacidade / Exclusão de Dados.
>
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Visão geral

Conjunto de páginas institucionais e legais da **Orion Agency**. Servem tanto à navegação do
usuário (suporte/contato/FAQ) quanto às **exigências legais (LGPD)** e de **revisão de app da
Meta** (política de privacidade pública, termos e instruções de exclusão de dados).

O conteúdo é **único e compartilhado** entre a versão in-app e a pública: ambas leem de
`src/lib/marketing/legal-content/*`. Só muda o "shell" (moldura) ao redor.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Página in-app (suporte) | [`src/app/[locale]/(app)/legal/support/page.tsx`](../../src/app/[locale]/(app)/legal/support/page.tsx) |
| Páginas in-app (about/terms/privacy/data-deletion) | `src/app/[locale]/(app)/legal/*/page.tsx` |
| **Shell in-app (header/breadcrumb/tabs)** | [`src/components/legal/AppInstitutionalShell.tsx`](../../src/components/legal/AppInstitutionalShell.tsx) |
| Render de página legal (conteúdo) | [`src/components/legal/AppLegalPageRenderer.tsx`](../../src/components/legal/AppLegalPageRenderer.tsx) |
| Blocos de conteúdo (header/card/section) | [`src/components/legal/AppInstitutionalContentPage.tsx`](../../src/components/legal/AppInstitutionalContentPage.tsx) |
| Página de suporte (contato + FAQ + form) | [`src/components/legal/AppInstitutionalSupport.tsx`](../../src/components/legal/AppInstitutionalSupport.tsx) |
| Páginas públicas (sem login) | `src/app/[locale]/(legal)/{privacy,terms,data-deletion}/page.tsx` |
| Conteúdo (privacidade) | [`src/lib/marketing/legal-content/privacy.ts`](../../src/lib/marketing/legal-content/privacy.ts) |
| Conteúdo (termos) | [`src/lib/marketing/legal-content/terms.ts`](../../src/lib/marketing/legal-content/terms.ts) |
| Conteúdo (exclusão de dados) | [`src/lib/marketing/legal-content/data-deletion.ts`](../../src/lib/marketing/legal-content/data-deletion.ts) |
| Conteúdo (sobre) | [`src/lib/marketing/legal-content/about.ts`](../../src/lib/marketing/legal-content/about.ts) |
| FAQ de suporte | [`src/lib/marketing/legal-content/support-faq.ts`](../../src/lib/marketing/legal-content/support-faq.ts) |
| **Contatos oficiais (e-mails, local, datas)** | [`src/lib/marketing/legal-contact.ts`](../../src/lib/marketing/legal-contact.ts) |
| Callback de exclusão da Meta | [`src/app/api/meta/data-deletion/route.ts`](../../src/app/api/meta/data-deletion/route.ts) |
| Lib do callback (assinatura, processamento) | `src/lib/meta-data-deletion.ts` |
| URL pública de status da exclusão | `getDataDeletionStatusUrl` em [`src/lib/app-url.ts`](../../src/lib/app-url.ts) |

## Páginas (tabs) e nomes

| Tab (i18n `nav.*`) | Rota in-app | Título da página (`marketing.*`) |
|---|---|---|
| Central de Ajuda (`support`) | `/legal/support` | **Central de Ajuda** (era "Contato" — alinhado à tab) |
| Sobre a Orion Agency (`about`) | `/legal/about` | Orion Agency |
| Termos de Uso (`terms`) | `/legal/terms` | Termos de Uso |
| Política de Privacidade (`privacy`) | `/legal/privacy` | Política de Privacidade |
| Exclusão de Dados (`dataDeletion`) | `/legal/data-deletion` | Instruções de Exclusão de Dados |

## Header / breadcrumb (redesign 2026-06-24)

O `AppInstitutionalShell` foi redesenhado para a tela **não destoar** das demais e ficar mais limpa:

- **Removido o link "← Destaques"** do topo.
- **Removido o fundo do header** (antes era uma barra `sticky` com `bg-[var(--surface-card)]` + borda).
- **Adicionado breadcrumb**: `Início › Institucional › <página atual>` (raiz "Início" usa `nav.home`,
  nova chave i18n; "Institucional" usa `nav.supportSection`).
- **Tabs** viraram pílulas (`rounded-full`) com hover suave; sem barra de fundo.

## Contato (e-mail único + envio real)

- **Um único e-mail**: `support@orionagency.com.br`. As páginas de contato (in-app
  [`AppInstitutionalSupport`](../../src/components/legal/AppInstitutionalSupport.tsx) e pública
  [`MarketingSupport`](../../src/components/marketing/MarketingSupport.tsx)) mostram apenas 2 cards:
  **Suporte** (e-mail + SLA) e **Localização**. Os e-mails comercial/privacidade foram removidos.
  Em [`legal-contact.ts`](../../src/lib/marketing/legal-contact.ts), `commercialEmail`/`privacyEmail`
  são aliases deprecados apontando para `supportEmail` (evita quebrar referências antigas).
- **SLA de resposta**: "Respondemos em até 48 horas em dias úteis" (`LEGAL_CONTACT.supportResponse`).
- **Formulário envia de verdade**: ambos os formulários fazem `POST /api/contact`
  ([route](../../src/app/api/contact/route.ts)), que envia e-mail para o suporte via
  `sendTransactionalEmail` ([email.ts](../../src/lib/email.ts), SendGrid). Mostra estado
  enviando/enviado/erro. Há um `console.log` de fallback no servidor.
  - **Requer** `SENDGRID_API_KEY` + `EMAIL_FROM` configurados; sem isso o envio é "skipped"
    (a mensagem fica só no log). Persistência em banco + tela de admin é follow-up (ver abaixo).

## Logo (OrionAgencyLogo)

Ajuste em [`OrionAgencyLogo.tsx`](../../src/components/brand/OrionAgencyLogo.tsx) (afeta todos os
lugares, inclusive login): o **"O" foi aumentado** (vira ícone-letra da palavra ORION), a **linha
foi deslocada para a esquerda** (sob toda a palavra Orion) e **"AGENCY" ficou centralizado** sob
Orion. viewBox e `WIDTH` recalculados para manter a altura renderizada.

## Login — Termos/Privacidade em modal

No [`LoginForm`](../../src/components/LoginForm.tsx), os links de Termos e Política de Privacidade
agora abrem em um **modal** ([`LegalModal`](../../src/components/auth/LegalModal.tsx)) — não navegam
para outra aba. O modal reusa o conteúdo de `legal-content/*` e segue o padrão de modais (Esc +
clique-fora).

## Marca: "Traffic AI" → "Orion Agency"

A marca foi renomeada para **Orion Agency** em todo o **texto de exibição**:
conteúdo legal, strings de tradução (`messages/pt-BR.json` e `en.json`), assuntos de e-mail,
descrições de fatura/NF, mensagens de alerta e nome padrão de campanha.

E-mails de contato migrados para o domínio **orionagency.com.br** (em [`legal-contact.ts`](../../src/lib/marketing/legal-contact.ts)):
`support@`, `commercial@`, `privacy@orionagency.com.br`.

### ⚠️ Identificadores NÃO renomeados (de propósito)

Trocá-los quebraria dados/integrações existentes. Mantidos como estão:

| Identificador | Arquivo | Por quê |
|---|---|---|
| `TRAFFIC_AI_AUDIENCE_PREFIX = "[Traffic AI]"` | `src/lib/audience-targeting-shared.ts` | Prefixo gravado no **nome dos públicos salvos na Meta**. Mudar quebra o reconhecimento/dedup de públicos já criados. Precisa de **migração** antes de renomear. |
| `META_SYNTHETIC_EMAIL_DOMAIN = "traffic-ai.local"` | `src/lib/tenant-name.ts` | Domínio sintético de e-mails de login via Meta (identificador interno estável). |
| `traffic-auto-sync-done` / `traffic-sync-done` | vários | Chaves de `sessionStorage` / nomes de evento internos. |
| Scripts/README/`.env.example` | `scripts/*`, `README.md` | Conteúdo de desenvolvimento, fora da UI. |

> Follow-up sugerido: planejar migração do prefixo de públicos para "[Orion Agency]" (com
> retrocompatibilidade de leitura do prefixo antigo).

## Conformidade com a Meta (revisão/aprovação do app)

Pesquisa dos requisitos da Meta para revisão de app (Data Use Checkup / Platform Terms) e como
a Orion Agency os atende hoje:

| Exigência da Meta | Como atendemos |
|---|---|
| **Política de privacidade pública e acessível**, com link válido no painel do app | `/{locale}/privacy` (pública) + `/legal/privacy` (in-app), mesmo conteúdo. |
| Política deve descrever **o que é coletado, como é usado, com quem é compartilhado, retenção e exclusão** | `privacy.ts` cobre: dados coletados (4.x), uso (5), IA (6), bases legais LGPD (7), compartilhamento/subprocessadores (8/16), transferência internacional (9), retenção (10), segurança (11), cookies (12), direitos (13). |
| **Caminho específico para o usuário solicitar exclusão** (self-service, e-mail ou suporte) | `data-deletion.ts`: instruções in-app, e-mail `privacy@orionagency.com.br`, e revogação do app na Meta. |
| **Data Deletion Request Callback** (HTTPS, recebe `signed_request` assinado, processa e devolve `confirmation_code` + URL de status) | [`/api/meta/data-deletion`](../../src/app/api/meta/data-deletion/route.ts): valida `signed_request` com o app secret, chama `processMetaUserDataDeletion`, retorna `{ url, confirmation_code }`. |
| **URL pública de status** da solicitação de exclusão | `getDataDeletionStatusUrl` → `/{locale}/data-deletion?confirmation=<code>`; a página pública lê o `?confirmation=` e exibe o status. |
| Solicitar **apenas as permissões necessárias** e declarar o uso | Documentado em `privacy.ts` §15 (Meta) e §4.3 (dados acessados via OAuth). |
| **Termos de uso** públicos | `/{locale}/terms` + `/legal/terms`. |

**Status:** todos os itens críticos para a revisão estão presentes. Nada novo precisou ser criado;
o que faltava era consistência de marca/nomes (corrigida).

> Ao publicar/atualizar, confirmar no **Meta Developer Dashboard**:
> Privacy Policy URL = `https://<dominio>/pt-BR/privacy`; Terms = `.../pt-BR/terms`;
> Data Deletion Request URL = `https://<dominio>/api/meta/data-deletion`.

Fontes da pesquisa Meta:
- https://developers.meta.com/horizon/policy/privacy-policy/
- https://developers.meta.com/horizon/policy/data-use/
- https://developers.meta.com/horizon/resources/publish-data-use/
- https://ppc.land/meta-enhances-developer-platform-with-new-user-data-deletion-requirements/

## i18n

- Tabs/breadcrumb: namespace `nav` (`home` novo, `support`, `about`, `terms`, `privacy`,
  `dataDeletion`, `supportSection`).
- Títulos/textos das páginas: namespace `marketing`.
- Conteúdo legal extenso: hardcoded em `src/lib/marketing/legal-content/*` (pt-BR + en por arquivo).

## Aceite de termos (persistido) — implementado

- Colunas `termsAcceptedAt` / `termsAcceptedVersion` em [`User`](../../src/db/entities/User.ts)
  (migration [0049](../../src/db/migrations/0049-UserTermsAcceptance.ts)). Versão atual em
  `LEGAL_CONTACT.termsVersion` ([legal-contact.ts](../../src/lib/marketing/legal-contact.ts)).
- **Cadastro** ([register-user.ts](../../src/lib/register-user.ts)) grava o aceite (o checkbox do
  formulário exige aceitar).
- **Endpoint** [`/api/auth/accept-terms`](../../src/app/api/auth/accept-terms/route.ts): `GET`
  retorna `{ accepted }` (compara a versão); `POST` registra o aceite do usuário logado.
- **Gate no 1º login** [`FirstLoginTermsGate`](../../src/components/auth/FirstLoginTermsGate.tsx)
  renderizado no [`AppShell`](../../src/components/layout/AppShell.tsx): se `accepted === false`
  (ex.: login social que nunca passou pelo cadastro, ou versão nova dos termos), abre um modal
  bonito pedindo o aceite, com links que abrem os documentos no `LegalModal`. Não fecha sem aceitar.
- **Resiliente**: se a coluna ainda não foi migrada, o `GET` cai no catch e retorna `accepted: true`
  (não bloqueia o app).

## Mensagens de contato (persistidas + admin) — implementado

- Entity [`ContactMessage`](../../src/db/entities/ContactMessage.ts) (tabela `contact_messages`,
  migration [0050](../../src/db/migrations/0050-ContactMessages.ts)); registrada no registry e em
  `repositories()`.
- [`/api/contact`](../../src/app/api/contact/route.ts) agora **grava no banco** (best-effort) além
  de enviar o e-mail.
- **Admin**: [`/api/admin/contacts`](../../src/app/api/admin/contacts/route.ts) (GET, só admin) +
  PATCH de status; tela [`/admin/contacts`](../../src/app/[locale]/(app)/admin/contacts/page.tsx)
  ([client](../../src/components/admin/AdminContactsClient.tsx)) lista as mensagens com marcar
  como lida/nova. Link "Contatos" no menu admin do usuário.

> Migrations rodam em runtime (dev) via `runPendingMigrations`; em produção/Vercel o runtime pula
> e elas devem ser aplicadas no deploy (`db:migrate`). Persistência e gate são best-effort para não
> quebrar caso a migration ainda não tenha rodado.

## Pendências / observações

- Migrar o prefixo de públicos `[Traffic AI]` (ver tabela de identificadores).
- Páginas `src/uxpilot-ui/pages/{Terms,Support,About}.tsx` parecem **legadas** (data "Janeiro de 2025"
  hardcoded, divergente do conteúdo oficial). Marca já renomeada nelas, mas avaliar remoção.
- Grammar pt: o sed gerou "O Orion Agency" em alguns trechos; aceitável, mas pode-se ajustar para
  "A Orion Agency" numa revisão de copy.

## Histórico de mudanças relevantes

- **2026-06-24 (parte 3):** Aceite de termos persistido (coluna em `User` + migration 0049 +
  endpoint + gate no 1º login). Mensagens de contato persistidas (entity `ContactMessage` +
  migration 0050) com tela admin em `/admin/contacts`.
- **2026-06-24 (parte 2):** E-mail único (support@) + SLA 48h; formulários enviam via
  `/api/contact` (SendGrid); logo ajustado (O maior, linha à esquerda, Agency centralizado);
  Termos/Privacidade abrem em modal no login. Follow-ups DB registrados acima.

- **2026-06-24:** Marca Traffic AI → Orion Agency em todo texto de exibição; e-mails →
  orionagency.com.br; shell legal redesenhado (sem fundo, sem "← Destaques", com breadcrumb,
  tabs em pílula); título da Central de Ajuda alinhado à tab; verificação de conformidade Meta
  documentada. Ver também [navegação/menu do usuário](../navegacao-sidebar/README.md).
