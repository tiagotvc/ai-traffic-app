import "server-only";

import { randomBytes } from "crypto";

import { signIn } from "@/auth";
import { repositories } from "@/db/repositories";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";
import { registerUser } from "@/lib/register-user";

/** Checkout público: quem chega sem sessão ganha conta+tenant novos na hora, a partir do
 * nome/e-mail já coletados no formulário — sem tela de login separada (o botão "comprar" da
 * landing não bate mais em /login). Se o e-mail já tem conta de verdade (com senha), não criamos
 * nada por cima — quem chama decide o que fazer (normalmente: pedir pra fazer login). */
export async function resolveOrCreateAnonymousTenant(
  name: string,
  email: string
): Promise<
  | { conflict: true }
  | { conflict: false; tenantId: string; userId: string }
> {
  const { user: userRepo } = await repositories();
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
  if (existing?.passwordHash) {
    return { conflict: true };
  }

  const password = randomBytes(24).toString("hex");
  const result = await registerUser({ email: normalizedEmail, password, name });
  if (!result.ok) {
    return { conflict: true };
  }

  const created = await userRepo.findOne({ where: { id: result.userId } });
  if (!created) throw new Error("Falha ao criar conta");

  await ensureFreeSubscription(created.tenantId);

  // Estabelece a sessão na mesma resposta — o formulário nunca vê a senha gerada.
  await signIn("credentials", { email: normalizedEmail, password, redirect: false });

  return { conflict: false, tenantId: created.tenantId, userId: created.id };
}
