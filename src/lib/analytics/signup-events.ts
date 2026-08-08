import "server-only";

import type { Attribution } from "@/lib/analytics/attribution";
import { buildFbcFromFbclid } from "@/lib/analytics/attribution";
import { sendMetaServerEvent } from "@/lib/analytics/meta-server-events";
import { CRM_SHEET_JOB_TYPE, type SignupSheetRow } from "@/lib/crm/signup-sheet";

/**
 * Ponto único onde um cadastro vira evento. Chamado dos três caminhos em que um
 * usuário nasce (e-mail/senha, login social, checkout anônimo).
 *
 * Duas pistas com bases legais diferentes, de propósito:
 *
 *   Pista 1 — Meta (CompleteRegistration): **só com consentimento**. Publicidade.
 *   Pista 2 — planilha interna: **sempre**. Registro comercial próprio da Orion
 *             (execução de contrato), com o consentimento anotado numa coluna.
 *
 * Nada aqui lança: cadastro não pode falhar por causa de rastreio.
 */

export type SignupMethod = "email" | "google" | "facebook" | "checkout";

export type SignupEventInput = {
  userId: string;
  email: string;
  name?: string | null;
  tenantId: string;
  method: SignupMethod;
  attribution?: Attribution | null;
  /** Escolha no banner no momento do cadastro. Ausente = não consentiu. */
  hasAnalyticsConsent: boolean;
  /** Cookies do Pixel, se o navegador já os tinha (melhora a correspondência). */
  fbp?: string;
  fbc?: string;
  /** IP/UA do request — a Meta usa os dois pra casar o evento. */
  clientIpAddress?: string;
  clientUserAgent?: string;
  eventSourceUrl?: string;
};

/** Enfileira o sync da planilha e drena logo em seguida, como o webhook do Asaas faz. */
export async function queueSignupSheetSync(row: SignupSheetRow): Promise<void> {
  try {
    const { enqueueBillingJob, processBillingJobs } = await import("@/lib/billing/jobs");
    await enqueueBillingJob(CRM_SHEET_JOB_TYPE, row as unknown as Record<string, unknown>);
    // Fire-and-forget: a entrega já está durável na fila, não vale segurar a resposta.
    void processBillingJobs(3).catch(() => {
      /* a próxima drenagem pega */
    });
  } catch (err) {
    console.error("[signup-events] falha ao enfileirar sync da planilha:", err);
  }
}

export async function onUserSignedUp(input: SignupEventInput): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  // Pista 1 — Meta. Só com consentimento.
  if (input.hasAnalyticsConsent) {
    tasks.push(
      sendMetaServerEvent({
        eventName: "CompleteRegistration",
        // Determinístico: se o cadastro for reprocessado, a Meta deduplica.
        eventId: `signup_${input.userId}`,
        userData: {
          email: input.email,
          externalId: input.tenantId,
          ...(input.clientIpAddress ? { clientIpAddress: input.clientIpAddress } : {}),
          ...(input.clientUserAgent ? { clientUserAgent: input.clientUserAgent } : {}),
          ...(input.fbp ? { fbp: input.fbp } : {}),
          // Sem o cookie do Pixel, reconstrói o fbc a partir do fbclid da URL.
          ...(input.fbc ?? buildFbcFromFbclid(input.attribution?.fbclid)
            ? { fbc: input.fbc ?? buildFbcFromFbclid(input.attribution?.fbclid) }
            : {})
        },
        customData: {
          content_name: "account_signup",
          registration_method: input.method,
          ...(input.attribution?.utm_campaign ? { campaign: input.attribution.utm_campaign } : {})
        },
        ...(input.eventSourceUrl ? { eventSourceUrl: input.eventSourceUrl } : {})
      })
    );
  }

  // Pista 2 — registro comercial. Sempre, com o consentimento anotado.
  tasks.push(
    queueSignupSheetSync({
      email: input.email,
      status: "cadastrado",
      nome: input.name ?? null,
      metodoCadastro: input.method,
      consentimento: input.hasAnalyticsConsent,
      attribution: input.attribution ?? null,
      dataCadastro: new Date().toISOString()
    })
  );

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[signup-events] falha ao registrar cadastro:", r.reason);
    }
  }
}
