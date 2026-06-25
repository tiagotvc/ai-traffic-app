# Pagamentos & Billing — auditoria, segurança e status

> Auditoria de prontidão (2026-06-25). Provedores: **Stripe** (internacional) e **Asaas** (Brasil/PIX).
> Fonte de verdade desta área. Atualize a cada mudança no billing.

## TL;DR — está pronto?

**Sim, o núcleo está pronto e razoavelmente seguro.** Stripe e Asaas cobram, webhooks são
verificados, o ciclo de vida da assinatura está implementado e há idempotência. Faltam
**melhorias de conveniência** (UI admin para atribuir plano, fluxo visual de downgrade, preview de
limites) e o **design da área financeira** pode melhorar.

## Arquitetura / arquivos

| Área | Arquivo |
|---|---|
| Serviço de billing | `src/lib/billing/billing-service.ts` |
| Entitlements/limites | `src/lib/billing/entitlements.ts`, `src/lib/billing/types.ts` |
| Stripe (checkout/portal/webhook) | `src/lib/stripe/*` |
| Asaas (pagamento/assinatura/NF) | `src/lib/asaas/*` |
| Webhooks | `src/app/api/webhooks/stripe/route.ts`, `.../asaas/route.ts` |
| Handlers de evento | `src/lib/billing/event-handlers.ts` |
| Idempotência / jobs | `src/lib/billing/jobs.ts` (`BillingEvent.idempotencyKey` UNIQUE) |
| Entities | `Subscription`, `Invoice`, `BillingCustomer`, `BillingEvent`, `BillingJob`, `Plan`, `RefundRequest`, `DiscountCoupon`, `TenantAddon`, `DashboardAddon` |
| Admin financeiro | `src/app/[locale]/(app)/admin/billing/{finance,plans,coupons,refunds}` |

## Checklist do que foi perguntado

| Pergunta | Resposta |
|---|---|
| Stripe pronto p/ cobrar? | ✅ Checkout (subscription), captura, **portal do cliente**, webhook com **assinatura HMAC verificada** (`stripe.webhooks.constructEvent`). |
| Asaas pronto p/ cobrar? | ✅ PIX (QR), cartão à vista/parcelado, assinatura recorrente, **NF-e**; webhook com **token verificado**. |
| Webhooks (receb./segurança)? | ✅ Stripe (HMAC) e Asaas (token em header). Eventos: payment received/confirmed/overdue, subscription canceled, checkout completed. **Idempotência** via `BillingEvent`. |
| Ativação de conta após pagamento? | ✅ `processPaymentReceived` → `activateProSubscription` (status active + período). |
| Upgrade de plano? | ✅ via novo checkout. **Downgrade**: só via admin API (sem UI dedicada). |
| Cancelamento? | ✅ `POST /api/billing/subscription/cancel` (cancel_at_period_end). |
| Renovação? | ✅ automática (Stripe/Asaas) via webhook. |
| past_due / suspensão? | ✅ grace de 3 dias → `suspended` (cron `suspendOverdueSubscriptions`); gating no login e em escrita; `BillingGateModal`. |
| Criar conta do zero + atribuir plano? | ✅ Signup cria **free trial (7 dias)** automático (`ensureFreeSubscription`). Admin atribui plano via `PATCH /api/admin/tenants/[id]/subscription` (sem UI visual — **gap**). |

## Segurança

✅ Bom: segredos em env (sem hardcode), webhook signatures verificadas, idempotência,
rotas admin protegidas (`requirePlatformAdmin`), queries com escopo de `tenantId`, refund com
revisão humana.

⚠️ Observações:
- Webhook Asaas **aceita sem token em dev** (`NODE_ENV !== production`) — ok para dev, garantir
  `ASAAS_WEBHOOK_TOKEN` em produção.
- Garantir em produção: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ASAAS_API_KEY`,
  `ASAAS_WEBHOOK_TOKEN`, `ASAAS_NF_SERVICE_CODE`.

## Gaps / melhorias recomendadas (a fazer)

1. **UI admin para atribuir/forçar plano** a um tenant (hoje só API). Tela em `/admin/billing` ou no
   detalhe do usuário admin.
2. **Fluxo de downgrade** visual para o usuário.
3. **Preview de limites** no checkout (quantos clientes/contas o plano novo permite).
4. **Design da área financeira** (admin finance + invoices) — ver doc de
   [landing-e-planos](../landing-e-planos/README.md#design-financeiro) para o plano de melhoria visual.

## Histórico
- 2026-06-25: Auditoria inicial (núcleo pronto; gaps de conveniência/visual listados).
