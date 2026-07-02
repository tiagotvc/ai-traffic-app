import "server-only";

import { randomBytes } from "crypto";

import { signIn } from "@/auth";
import { repositories } from "@/db/repositories";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";
import { hashPassword } from "@/lib/password";
import { registerUser } from "@/lib/register-user";

/** Checkout público: quem chega sem sessão ganha conta+tenant novos na hora, a partir do
 * nome/e-mail já coletados no formulário — sem tela de login separada (o botão "comprar" da
 * landing não bate mais em /login). Se o e-mail já tem conta de verdade (com senha ou login
 * social), não criamos nada por cima — quem chama decide o que fazer (normalmente: pedir login).
 *
 * IMPORTANTE: a conta criada aqui fica PENDENTE — sem senha (passwordHash null) e sem sessão.
 * Só depois do pagamento passar é que o caller chama establishAnonymousSession(). Se o pagamento
 * falhar, a conta pendente não loga nem acessa nada, e uma nova tentativa com o mesmo e-mail
 * reutiliza a mesma conta em vez de dar ACCOUNT_EXISTS. */
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
  if (existing && (existing.passwordHash || existing.googleId || existing.facebookId)) {
    return { conflict: true };
  }
  if (existing) {
    // Conta pendente de uma tentativa anterior (tokenize/checkout que falhou) — reutiliza.
    await ensureFreeSubscription(existing.tenantId);
    return { conflict: false, tenantId: existing.tenantId, userId: existing.id };
  }

  const password = randomBytes(24).toString("hex");
  const result = await registerUser({ email: normalizedEmail, password, name });
  if (!result.ok) {
    return { conflict: true };
  }

  const created = await userRepo.findOne({ where: { id: result.userId } });
  if (!created) throw new Error("Falha ao criar conta");

  // Zera a senha aleatória: marca a conta como pendente até o pagamento ser aceito.
  created.passwordHash = null;
  await userRepo.save(created);

  await ensureFreeSubscription(created.tenantId);

  return { conflict: false, tenantId: created.tenantId, userId: created.id };
}

/** Chamar SÓ depois do provedor aceitar a cobrança: dá uma senha aleatória à conta pendente e
 * estabelece a sessão na mesma resposta — o formulário nunca vê a senha gerada. */
export async function establishAnonymousSession(userId: string): Promise<void> {
  const { user: userRepo } = await repositories();
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado");

  const password = randomBytes(24).toString("hex");
  user.passwordHash = await hashPassword(password);
  await userRepo.save(user);

  await signIn("credentials", { email: user.email, password, redirect: false });
}
