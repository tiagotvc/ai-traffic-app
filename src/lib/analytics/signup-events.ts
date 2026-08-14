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

/**
 * Guarda `fbp`/`fbc` junto da atribuição já gravada (jsonb, sem migration). A venda é
 * confirmada por webhook, sem navegador — se estes cookies não ficarem registrados
 * agora, o `Purchase` nunca terá como ser creditado ao clique do anúncio.
 *
 * Best-effort e não destrutivo: preserva a atribuição existente e nunca sobrescreve um
 * cookie já gravado (o primeiro clique é o que trouxe a pessoa).
 */
async function persistMetaCookies(
  userId: string,
  cookies: { fbp?: string; fbc?: string }
): Promise<void> {
  if (!cookies.fbp && !cookies.fbc) return;
  try {
    const { user: userRepo } = await (await import("@/db/repositories")).repositories();
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return;

    const current = user.signupAttribution ?? {};
    const merged = {
      ...current,
      ...(cookies.fbp && !current.fbp ? { fbp: cookies.fbp } : {}),
      ...(cookies.fbc && !current.fbc ? { fbc: cookies.fbc } : {})
    };
    if (JSON.stringify(merged) === JSON.stringify(current)) return;

    await userRepo.update(userId, { signupAttribution: merged });
  } catch (err) {
    console.error("[signup-events] falha ao persistir cookies do Pixel:", err);
  }
}

export async function onUserSignedUp(input: SignupEventInput): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  // Sem o cookie do Pixel, reconstrói o fbc a partir do fbclid da URL — recupera boa
  // parte da correspondência de quem chegou por anúncio antes de aceitar cookies.
  const fbc = input.fbc ?? buildFbcFromFbclid(input.attribution?.fbclid);

  // Pista 1 — Meta. Só com consentimento.
  if (input.hasAnalyticsConsent) {
    tasks.push(persistMetaCookies(input.userId, { ...(input.fbp ? { fbp: input.fbp } : {}), ...(fbc ? { fbc } : {}) }));
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
          ...(fbc ? { fbc } : {})
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

  // Pista 4: funil próprio. Sempre, e é justamente o que fecha a conta entre "cliques
  // no anúncio" e "contas criadas" quando o número da Meta vier menor (parte do público
  // recusa cookies e some dos eventos de lá).
  tasks.push(
    (async () => {
      const { readVisitorId } = await import("@/lib/funnel/visitor-id");
      const { recordFunnelEvent } = await import("@/lib/funnel/record-event");
      await recordFunnelEvent({
        // Sem cookie de visitante (janela anônima, cookie limpo) o usuário vira a chave:
        // a linha precisa existir de qualquer jeito pra contagem do dia fechar.
        visitorId: (await readVisitorId()) ?? `user:${input.userId}`,
        userId: input.userId,
        tenantId: input.tenantId,
        eventType: "completed_signup",
        email: input.email,
        meta: {
          method: input.method,
          ...(input.attribution && Object.keys(input.attribution).length
            ? { attribution: input.attribution }
            : {})
        }
      });
    })()
  );

  // Pista 3 — aviso operacional pro time. Sempre: é comunicação interna sobre o próprio
  // cliente, não publicidade, então não passa pelo banner de cookies.
  tasks.push(
    (async () => {
      const { notifyAdminNewSignup } = await import("@/lib/billing/funnel-alerts");
      await notifyAdminNewSignup({
        email: input.email,
        name: input.name ?? null,
        method: input.method,
        utmSource: input.attribution?.utm_source ?? null,
        utmCampaign: input.attribution?.utm_campaign ?? null
      });
    })()
  );

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
