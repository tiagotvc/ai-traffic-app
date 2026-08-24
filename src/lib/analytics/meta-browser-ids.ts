import "server-only";

import { randomInt } from "crypto";
import { cookies } from "next/headers";

import { buildFbcFromFbclid } from "@/lib/analytics/attribution";
import { buildFbp, readFbclid } from "@/lib/analytics/meta-fb-id-format";

/**
 * Identificadores de navegador da Meta (`_fbp` / `_fbc`) para a Conversions API.
 *
 * O problema que isto resolve: ler os cookies e torcer para existirem dava nota baixa
 * de correspondência (3,6/10 em 11/08/2026), porque quem escreve os dois é o Pixel e
 * ele escreve DEPOIS do primeiro pageview:
 *
 *   • `_fbc` só nasce quando a pessoa chega com `fbclid` na URL — ou seja, some
 *     justamente no clique vindo do anúncio pago, que é o evento que mais importa.
 *     O diagnóstico da Meta acusava "server is not sending Click ID (fbc)".
 *   • `_fbp` chegava em 37,5% dos eventos, perdido na corrida contra o Pixel.
 *
 * Aqui os dois são derivados no servidor quando faltam e gravados como cookie
 * first-party. O Pixel não sobrescreve cookie existente, então os dois lados passam a
 * usar o mesmo id. Nada disso é dado inventado: o `fbc` carrega o `fbclid` real da
 * URL, e o `fbp` é só um id de navegador que nos pertence.
 */

const FBP_COOKIE = "_fbp";
const FBC_COOKIE = "_fbc";
const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90;

export type MetaBrowserIds = { fbp?: string; fbc?: string };

type CookieJar = Awaited<ReturnType<typeof cookies>>;

/**
 * Gravar cookie só é permitido em Route Handler e Server Action. Em Server Component o
 * Next lança, e rastreio nunca pode derrubar a página: falhou, segue sem persistir e o
 * valor ainda vale para o evento atual.
 */
function trySetCookie(jar: CookieJar, name: string, value: string): void {
  try {
    jar.set(name, value, {
      // O Pixel do navegador precisa ler estes cookies, então não pode ser httpOnly.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: NINETY_DAYS_SECONDS,
      path: "/"
    });
  } catch {
    // segue sem persistir
  }
}

/**
 * Devolve `fbp`/`fbc` do request, derivando e persistindo o que faltar.
 *
 * Chamar apenas de Route Handler ou Server Action. Para leitura pura (Server Component),
 * usar `readMetaBrowserCookies()` de [[src/lib/server-consent.ts]].
 */
export async function resolveMetaBrowserIds(opts?: {
  eventSourceUrl?: string | null;
  nowMs?: number;
}): Promise<MetaBrowserIds> {
  const now = opts?.nowMs ?? Date.now();
  let jar: CookieJar;
  try {
    jar = await cookies();
  } catch {
    return {};
  }

  let fbp = jar.get(FBP_COOKIE)?.value?.trim() || undefined;
  if (!fbp) {
    fbp = buildFbp(now, randomInt(1_000_000_000, 10_000_000_000));
    trySetCookie(jar, FBP_COOKIE, fbp);
  }

  let fbc = jar.get(FBC_COOKIE)?.value?.trim() || undefined;
  if (!fbc) {
    const fbclid = readFbclid(opts?.eventSourceUrl);
    fbc = buildFbcFromFbclid(fbclid ?? undefined, now);
    if (fbc) trySetCookie(jar, FBC_COOKIE, fbc);
  }

  return { ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) };
}
