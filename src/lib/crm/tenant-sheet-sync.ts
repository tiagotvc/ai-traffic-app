import "server-only";

import { repositories } from "@/db/repositories";
import { queueSignupSheetSync } from "@/lib/analytics/signup-events";
import type { SignupSheetStatus } from "@/lib/crm/signup-sheet";

/**
 * Atualiza a linha da planilha quando o status da assinatura muda.
 *
 * O upsert é por e-mail, então o desafio é sempre o mesmo: descobrir *qual pessoa*
 * representa este tenant. Mesma regra do e-mail de boas-vindas — o e-mail de
 * cobrança é a fonte mais confiável, com o admin mais antigo como reserva.
 */

export type TenantContact = {
  email: string;
  name?: string | null;
  phone?: string | null;
  /** Consentimento congelado no cadastro; o webhook não tem cookie pra consultar. */
  hasAnalyticsConsent: boolean;
  /** Cookies do Pixel gravados no cadastro — atribuição do `Purchase` server-side. */
  fbp?: string;
  fbc?: string;
};

export async function resolveTenantContact(tenantId: string): Promise<TenantContact | null> {
  const {
    billingCustomer: custRepo,
    tenantMember: memberRepo,
    user: userRepo
  } = await repositories();

  const customer = await custRepo.findOne({ where: { tenantId } });

  // O consentimento vive no usuário, não no cliente de cobrança — busca sempre o
  // admin mais antigo pra resolvê-lo, mesmo quando já temos o e-mail da cobrança.
  const member = await memberRepo.findOne({
    where: { tenantId, role: "admin" },
    order: { createdAt: "ASC" }
  });
  const adminUser = member ? await userRepo.findOne({ where: { id: member.userId } }) : null;

  const email = customer?.email ?? adminUser?.email;
  if (!email) return null;

  const attribution = adminUser?.signupAttribution ?? null;

  return {
    email,
    name: customer?.name ?? adminUser?.name ?? null,
    phone: customer?.phone ?? null,
    hasAnalyticsConsent: adminUser?.analyticsConsent === "accepted",
    ...(attribution?.fbp ? { fbp: attribution.fbp } : {}),
    ...(attribution?.fbc ? { fbc: attribution.fbc } : {})
  };
}

/**
 * Enfileira a atualização de status. Best-effort e silencioso: a planilha nunca
 * pode derrubar o processamento de um webhook de pagamento.
 */
export async function syncTenantStatusToSheet(
  tenantId: string,
  status: SignupSheetStatus,
  extra: { planName?: string | null; valueCents?: number | null; billingCycle?: "monthly" | "yearly" | null } = {}
): Promise<void> {
  try {
    const contact = await resolveTenantContact(tenantId);
    if (!contact) return;

    await queueSignupSheetSync({
      email: contact.email,
      status,
      nome: contact.name,
      telefone: contact.phone,
      plano: extra.planName ?? null,
      valor: extra.valueCents != null ? Number((extra.valueCents / 100).toFixed(2)) : null,
      ciclo: extra.billingCycle ?? null,
      consentimento: contact.hasAnalyticsConsent
    });
  } catch (err) {
    console.error(`[crm-sheet] falha ao sincronizar status=${status} tenant=${tenantId}:`, err);
  }
}
