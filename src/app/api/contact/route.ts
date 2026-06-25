import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { sendTransactionalEmail } from "@/lib/email";
import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";

const ContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(160),
  company: z.string().max(160).optional().default(""),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000)
});

/**
 * Recebe mensagens dos formulários de contato (in-app e site público) e envia para o
 * e-mail de suporte. Não exige login (formulário público). Sem persistência em banco
 * nesta versão — ver follow-up de ContactMessage entity para acesso via admin.
 */
export async function POST(req: Request) {
  let parsed;
  try {
    parsed = ContactSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const text = [
    `Nome: ${parsed.name}`,
    `E-mail: ${parsed.email}`,
    parsed.company ? `Empresa: ${parsed.company}` : null,
    `Assunto: ${parsed.subject}`,
    "",
    parsed.message,
    "",
    "— Enviado via formulário de contato da Orion Agency"
  ]
    .filter(Boolean)
    .join("\n");

  // Persiste a mensagem para acesso via admin (best-effort — não quebra o envio).
  try {
    const { contactMessage } = await repositories();
    await contactMessage.save(
      contactMessage.create({
        name: parsed.name,
        email: parsed.email,
        company: parsed.company || null,
        subject: parsed.subject,
        message: parsed.message,
        status: "new",
        source: "web"
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[contact] falha ao persistir (seguindo):", err);
  }

  // Log de fallback (capturado mesmo se o provedor de e-mail não estiver configurado).
  // eslint-disable-next-line no-console
  console.log("[contact] nova mensagem:", { name: parsed.name, email: parsed.email, subject: parsed.subject });

  try {
    const result = await sendTransactionalEmail({
      to: LEGAL_CONTACT.supportEmail,
      subject: `[Contato] ${parsed.subject}`,
      text
    });
    return NextResponse.json({ ok: true, delivered: result.ok === true });
  } catch {
    // Falha no provedor não deve quebrar o formulário; a mensagem ficou no log do servidor.
    return NextResponse.json({ ok: true, delivered: false });
  }
}
