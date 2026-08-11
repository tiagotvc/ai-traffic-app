import "server-only";

import type { Attribution } from "@/lib/analytics/attribution";

/**
 * Carrega a atribuição de campanha pelo ida-e-volta do OAuth.
 *
 * No cadastro por e-mail os utm_* viajam na URL até a server action. No login
 * social isso não funciona: quem redireciona é o Google/Facebook, e a URL de
 * volta é montada por eles. Um cookie curtinho é a única forma de a informação
 * sobreviver ao caminho.
 *
 * LGPD: gravar isso no dispositivo é rastreio, então **só grava com
 * consentimento**. Sem aceite, o cadastro social entra na planilha sem origem —
 * é a consequência esperada de respeitar a recusa, não um defeito.
 */

const COOKIE = "orion_attr_pending";
/** Só precisa sobreviver ao redirect do provedor; 15 min cobre com folga. */
const MAX_AGE_SECONDS = 15 * 60;

export async function storePendingAttribution(attribution: Attribution): Promise<void> {
  if (!Object.keys(attribution).length) return;
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    store.set(COOKIE, JSON.stringify(attribution), {
      maxAge: MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
  } catch {
    /* fora de contexto de request — segue sem atribuição */
  }
}

/** Lê e apaga (só serve uma vez, no momento em que o usuário é criado). */
export async function consumePendingAttribution(): Promise<Attribution | null> {
  try {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    const raw = store.get(COOKIE)?.value;
    if (!raw) return null;
    store.delete(COOKIE);
    const parsed = JSON.parse(raw) as Attribution;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
