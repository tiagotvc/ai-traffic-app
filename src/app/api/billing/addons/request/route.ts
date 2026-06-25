import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { sendTransactionalEmail } from "@/lib/email";
import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";

const RequestSchema = z.object({
  addon: z.enum(["clients", "adAccounts", "ai"]),
  note: z.string().max(500).optional().default("")
});

const ADDON_LABEL: Record<string, string> = {
  clients: "+1 cliente",
  adAccounts: "+3 contas de anúncio",
  ai: "+50 sugestões de IA"
};

/**
 * Solicitação de addon (self-serve). Persiste como ContactMessage (visível no /admin/contacts)
 * e notifica o suporte por e-mail. O admin concede via PATCH /api/admin/tenants/[id]/addons.
 * (Cobrança self-serve via provedor é follow-up — precisa de SKUs de addon.)
 */
export async function POST(req: Request) {
  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let tenantName = "";
  let tenantId = "";
  try {
    const ctx = await getAppContext();
    tenantName = ctx.tenant?.name ?? "";
    tenantId = ctx.tenant?.id ?? "";
  } catch {
    /* segue sem o tenant */
  }

  const label = ADDON_LABEL[body.addon] ?? body.addon;
  const subject = `Solicitação de addon: ${label}`;
  const message = [
    `Workspace: ${tenantName || "(desconhecido)"}${tenantId ? ` (${tenantId})` : ""}`,
    `Addon: ${label} (${body.addon})`,
    body.note ? `Observação: ${body.note}` : null
  ]
    .filter(Boolean)
    .join("\n");

  // Persiste para o admin acompanhar/conceder.
  try {
    const { contactMessage } = await repositories();
    await contactMessage.save(
      contactMessage.create({
        name: session?.user?.name ?? email,
        email,
        subject,
        message,
        status: "new",
        source: "addon"
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[addon request] persist falhou:", err);
  }

  try {
    await sendTransactionalEmail({ to: LEGAL_CONTACT.supportEmail, subject: `[Addon] ${subject}`, text: message });
  } catch {
    /* e-mail é best-effort */
  }

  return NextResponse.json({ ok: true });
}
