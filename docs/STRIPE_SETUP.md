# Stripe — setup (sandbox / produção)

Checklist do Dashboard antes de testar o trilho internacional.

## 1. API keys

- Sandbox: Developers → API keys → `pk_test_…` e `sk_test_…`
- `.env.local`:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

## 2. Products + Prices (USD)

Para cada plano (Basic, Advanced, Agency):

1. Products → Add product (tax code SaaS / digital services)
2. Criar Price **mensal** e **anual** em USD
3. Copiar Price IDs em Admin → Billing → Plans (`priceIdMonthly` / `priceIdYearly`)

## 3. Stripe Tax

1. Settings → Tax → Enable Stripe Tax
2. Configurar origem do negócio e registros fiscais (nexus)

## 4. Payment methods

1. Settings → Payment methods
2. Manter cartões + Apple Pay + Google Pay + Link
3. Opcional: SEPA / ACH para EUA/Europa
4. **Desabilitar** Pix/boleto Stripe (Brasil usa Asaas)

## 5. Customer Portal

1. Settings → Billing → Customer portal
2. Habilitar **update payment method**
3. **Desabilitar** cancelamento e troca de plano no Portal (controle fica em `/billing`)

## 6. Webhook

1. Developers → Webhooks → Add endpoint
2. URL: `https://<dominio>/api/webhooks/stripe`
3. Eventos:
   - `checkout.session.completed`
   - `invoice.paid`, `invoice.payment_failed`
   - `customer.subscription.updated`, `customer.subscription.deleted`
4. Local: `stripe listen --forward-to localhost:3008/api/webhooks/stripe`

## 7. Go-live

Trocar keys `live`, recriar Products/Prices live, novo webhook + `whsec`, Price IDs no admin.
