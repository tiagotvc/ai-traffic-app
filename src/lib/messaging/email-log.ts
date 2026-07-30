import "server-only";

import { repositories } from "@/db/repositories";
import type { EmailLogKind } from "@/db/entities/EmailLog";
import type { WelcomeEmailInput } from "@/lib/messaging/welcome-email";

/** Registra uma tentativa de envio (sucesso ou falha) — nunca lança, best-effort. */
export async function recordEmailLog(input: {
  tenantId: string;
  kind: EmailLogKind;
  to: string;
  payload: Record<string, unknown>;
  sent: boolean;
  error?: string | null;
}): Promise<void> {
  try {
    const { emailLog: repo } = await repositories();
    await repo.save(
      repo.create({
        tenantId: input.tenantId,
        kind: input.kind,
        to: input.to,
        payload: input.payload,
        sent: input.sent,
        error: input.error ?? null
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email-log] falha ao registrar tentativa", err);
  }
}

/** Reenvia um e-mail a partir do log salvo, gravando uma nova tentativa. */
export async function resendEmailLog(logId: string): Promise<{ sent: boolean; error?: string }> {
  const { emailLog: repo } = await repositories();
  const log = await repo.findOne({ where: { id: logId } });
  if (!log) return { sent: false, error: "Log não encontrado" };

  if (log.kind === "welcome") {
    const { sendWelcomeEmail } = await import("@/lib/messaging/welcome-email");
    const result = await sendWelcomeEmail(log.payload as unknown as WelcomeEmailInput);
    await recordEmailLog({
      tenantId: log.tenantId,
      kind: log.kind,
      to: log.to,
      payload: log.payload,
      sent: result.sent,
      error: result.error ?? null
    });
    return result;
  }

  return { sent: false, error: `Tipo de e-mail desconhecido: ${log.kind}` };
}
