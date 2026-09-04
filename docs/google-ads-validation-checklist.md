# 🛰️ Roteiro de Validação — App Orion no Google Ads

> **Entenda de cara:** "validar o app no Google Ads" são **dois processos separados e paralelos**, e você precisa dos dois liberados pra rodar em produção:
> - **A) Verificação da tela de consentimento OAuth** (Google Cloud) — porque você usa o escopo sensível `auth/adwords`.
> - **B) Aprovação do Developer Token** (Google Ads API Center) — Basic Access + o *tool change form* pra sair de "somente leitura" e poder criar/gerenciar anúncios.

---

## Fase 0 — Pré-requisitos (antes de qualquer submissão)

- [ ] Projeto no **Google Cloud Console** criado e com a **Google Ads API** habilitada
- [ ] **Developer token** emitido no API Center da **MCC** (hoje já emitido — está com use *Reporting/somente leitura*)
- [ ] **OAuth Client ID** (tipo Web) criado, com `redirect_uri` de produção **e** de dev registrados
- [ ] `GOOGLE_ADS_ENABLED` continua **off** em produção até tudo aprovado (protege a review da Meta)
- [ ] Domínio de produção próprio, no ar e verificado no **Google Search Console** (a verificação OAuth exige propriedade do domínio)

---

## Fase A — Verificação da tela de consentimento OAuth (escopo `auth/adwords`)

> Esse processo resolve, de quebra, o **bug do refresh token de 7 dias** (hoje o consent está em "Testing"). Publicar + verificar = tokens param de expirar.

### A.1 — Configuração da tela de consentimento
- [ ] User type = **External**
- [ ] Nome do app, e-mail de suporte e **logo** enviados (logo passa por brand verification)
- [ ] **Domínios autorizados** preenchidos (domínio de produção)
- [ ] Link da **Política de Privacidade** público → `/privacidade` (já cobre Google Ads, com cláusula **Limited Use** na §17)
- [ ] Link dos **Termos de Serviço** público → `/termos` (já tem §9.1 Google Ads)
- [ ] Escopo `https://www.googleapis.com/auth/adwords` declarado e **justificado**

### A.2 — Publicação
- [ ] Status do app alterado de **"Testing" → "In production"**
- [ ] App submetido para **verificação** (obrigatório por causa do escopo sensível)

### A.3 — Vídeo de demonstração (a parte que mais reprova)
- [ ] Vídeo no **YouTube** (pode ser não listado) mostrando:
    - [ ] O fluxo **OAuth completo** na tela real (usuário clica "Conectar Google Ads" → tela de consentimento Google → volta como "Conectada")
    - [ ] A **URL do domínio** visível na barra durante o fluxo
    - [ ] **Como cada dado do escopo `adwords` é usado** dentro do app (campanhas, keywords, métricas, recomendações)
    - [ ] Onde aparece a política de privacidade dentro do produto
- [ ] Link do vídeo colado no formulário de verificação

### A.4 — Limited Use (política de dados do Google)
- [ ] Privacidade declara explicitamente conformidade com a **Google API Services User Data Policy → Limited Use** (já está na §17)
- [ ] Nenhum dado do Google Ads é vendido, usado pra publicidade própria, ou lido por humanos além do necessário — e isso está escrito

---

## Fase B — Aprovação do Developer Token (Google Ads API)

### B.1 — Basic Access
- [ ] Formulário de **API Access** preenchido no API Center da MCC
- [ ] Design doc / descrição da ferramenta: o que o app faz, quais endpoints usa, como armazena tokens, público-alvo
- [ ] Conformidade com a **Required Minimum Functionality (RMF)** — o Google exige um conjunto mínimo de recursos, não só leitura de relatório
- [ ] Basic Access aprovado (libera chamadas contra contas de produção, com limites)

### B.2 — Permissible Use = Ad creation/management (destrava a ESCRITA)
> Hoje o token está **Reporting = somente leitura**. Toda mutation (criar campanha, pausar, add keyword) é recusada com 403 até isso mudar.

- [ ] Enviar o **tool change form** solicitando use *"Ad creation and management"*
- [ ] Aguardar aprovação (leva dias)
- [ ] Enquanto não aprova: desenvolver/testar escrita contra **conta de teste sob a MCC** (dry-run já é o default)

### B.3 — (Opcional/futuro) Standard Access
- [ ] Solicitar Standard quando precisar de volume acima dos limites do Basic

---

## Fase C — Prontidão técnica do app (antes de ligar em prod)

- [ ] `GOOGLE_ADS_API_VERSION` numa versão suportada (hoje **v24** — Google mantém só ~3; monitorar deprecations)
- [ ] Fluxo OAuth com `access_type=offline` + `prompt=consent` gravando **refresh_token**
- [ ] Renovação de access token sob demanda funcionando (`google-auth-store.ts`)
- [ ] **Reconexão graceful**: tratar `not_connected` no front com CTA "Reconectar" *(⚠️ pendente — hoje mostra erro genérico)*
- [ ] `login-customer-id` (MCC) enviado nas chamadas, com fallback MCC→self
- [ ] Leitura validada ao vivo (KPIs, drill-down, keywords, breakdowns, alertas, relatórios)
- [ ] Escrita validada em **dry-run** contra conta de teste *(⚠️ falta rodar 100% ao vivo com sessão autenticada)*
- [ ] `tsc` limpo antes de qualquer deploy

---

## Fase D — Go-live

- [ ] Fase A **aprovada** (consent verificado + In production)
- [ ] Fase B **aprovada** (Basic + Ad management)
- [ ] `GOOGLE_ADS_ENABLED = on` em produção
- [ ] Teste ponta-a-ponta com conta real fora da equipe (conta de teste de review)
- [ ] Monitorar quotas e erros do API Center nos primeiros dias

---

## Ordem prática recomendada

1. **Publicar o consent screen** primeiro (Fase A.2) → já mata o bug dos 7 dias, mesmo antes da verificação completa aprovar.
2. Rodar **A** e **B** em paralelo (são filas diferentes no Google).
3. Fechar a pendência de UX do `not_connected` (Fase C) enquanto espera.
4. Só ligar `GOOGLE_ADS_ENABLED` quando os dois carimbos vierem.
