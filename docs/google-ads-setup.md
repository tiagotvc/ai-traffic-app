# Google Ads — setup de acesso à API

Guia do que precisa ser solicitado/configurado no lado do Google para a integração
funcionar. O código já está pronto para receber essas credenciais (atrás do kill-switch
`GOOGLE_ADS_ENABLED`, que fica **off** por padrão).

> Ordem recomendada: 1 → 2 → 3 → 4. Os passos 2 e 3 podem levar horas/dias por dependerem
> de aprovação do Google.

## 1. Projeto no Google Cloud + OAuth Client

1. [console.cloud.google.com](https://console.cloud.google.com) → crie/selecione um projeto.
2. **APIs & Services → Library** → ative a **Google Ads API**.
3. **APIs & Services → OAuth consent screen** → configure (External), adicione o scope
   `https://www.googleapis.com/auth/adwords` e os usuários de teste enquanto o app estiver
   em modo "Testing".
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** (tipo *Web
   application*). Em **Authorized redirect URIs** adicione, para cada ambiente:
   - `http://localhost:3008/api/google/oauth/callback` (dev)
   - `https://SEU_DOMINIO/api/google/oauth/callback` (produção)
5. Copie o **Client ID** e **Client secret** →
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 2. Conta Manager (MCC)

A Google Ads API opera melhor por uma conta **Manager (MCC)**, que "enxerga" as contas
dos clientes por hierarquia.

1. Crie em [ads.google.com/home/tools/manager-accounts](https://ads.google.com/home/tools/manager-accounts).
2. Vincule (link) as contas de anúncios dos clientes ao MCC.
3. O ID do MCC (formato `123-456-7890`) vai em `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
   **só com os dígitos** (`1234567890`).

## 3. Developer token (API Center)

Obrigatório em **toda** chamada da API (além do OAuth).

1. Dentro do **MCC**: **Tools & Settings → Setup → API Center**.
2. Copie o **developer token** → `GOOGLE_ADS_DEVELOPER_TOKEN`.
3. Níveis de acesso:
   - **Test account access** (imediato): só chama contas de **teste**. Bom para desenvolver.
   - **Basic access** (requer formulário de aprovação): chama contas **reais**, com limites.
   - **Standard access**: limites maiores.
   > Enquanto o token estiver em "test", crie uma **conta de teste** sob o MCC para validar
   > o fluxo ponta-a-ponta.

## 4. Variáveis de ambiente

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_ADS_DEVELOPER_TOKEN="..."
GOOGLE_ADS_LOGIN_CUSTOMER_ID="1234567890"   # dígitos do MCC
GOOGLE_ADS_ENABLED="1"                         # liga a integração (default: off)
```

## Como validar (Milestone 1 — conexão de conta)

1. `GOOGLE_ADS_ENABLED=1` + as 3 credenciais acima definidas.
2. Em **Configurações → Integrações**, o card "Google Ads" passa de "em breve" para
   **Conectar Google Ads**.
3. Clicar → consent do Google → volta com `?googleConnected=1`.
4. `GET /api/google-ads/accounts` retorna as contas acessíveis (IDs + nome/moeda/timezone).

## Notas técnicas

- Access token do Google expira em ~1h; persistimos o **refresh_token** (obtido no 1º
  consent via `access_type=offline` + `prompt=consent`) e renovamos sob demanda em
  `google-auth-store.ts`.
- Versão da API centralizada em `GOOGLE_ADS_API_VERSION` (`src/lib/google-ads-api.ts`).
- Tudo isolado do fluxo Meta (silo paralelo) e gated por `isGoogleAdsEnabled()`.
