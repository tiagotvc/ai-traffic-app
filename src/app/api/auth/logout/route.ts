import { NextResponse, type NextRequest } from "next/server";

import { signOut } from "@/auth";
import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

// next-auth (JWT strategy) splits large session tokens into chunked cookies
// (authjs.session-token.0, .1, …). signOut() em route handler nem sempre limpa
// todos os chunks de forma confiável no beta, então expiramos manualmente também.
const AUTH_COOKIE_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"];

function isAuthSessionCookie(name: string) {
  return AUTH_COOKIE_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}.`)
  );
}

export async function POST(req: NextRequest) {
  // Best-effort: registra o logout e chama signOut, mas NUNCA bloqueia a limpeza
  // dos cookies — assim o usuário sempre consegue sair, mesmo se a sessão já
  // estiver inválida ou algo aqui falhar.
  try {
    const { user } = await getAppContext();
    const { notificationState: repo } = await repositories();
    let state = await repo.findOne({ where: { userId: user.id } });
    if (!state) state = repo.create({ userId: user.id });
    state.lastLogoutAt = new Date();
    await repo.save(state);
  } catch {
    /* segue limpando os cookies */
  }

  try {
    await signOut({ redirect: false });
  } catch {
    /* segue limpando os cookies */
  }

  const res = NextResponse.json({ ok: true });
  for (const cookie of req.cookies.getAll()) {
    if (!isAuthSessionCookie(cookie.name)) continue;
    res.cookies.set(cookie.name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: cookie.name.startsWith("__Secure-")
    });
  }
  return res;
}
