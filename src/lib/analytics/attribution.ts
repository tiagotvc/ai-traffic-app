/**
 * Atribuição de campanha capturada na chegada e carregada **pela URL** até o
 * cadastro (LP → CTA → /login → server action).
 *
 * Por que pela URL e não por cookie: guardar isso no dispositivo seria rastreio e
 * exigiria consentimento (LGPD). Trafegando na querystring nada é gravado no
 * navegador, e a atribuição sobrevive mesmo pra quem recusa cookies.
 */

export const ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid"
] as const;

export type AttributionParam = (typeof ATTRIBUTION_PARAMS)[number];
export type Attribution = Partial<Record<AttributionParam, string>>;

/**
 * O que fica gravado em `users.signupAttribution` (jsonb): a atribuição da URL mais os
 * cookies do Pixel capturados no cadastro.
 *
 * Os cookies ficam aqui porque a venda é confirmada por webhook, horas ou dias depois,
 * sem navegador nenhum — sem persistir, o `Purchase` sai só com hash de e-mail/telefone
 * e a Meta não consegue creditar a conversão ao clique do anúncio. É jsonb, então não
 * exige migration para crescer.
 */
export type SignupAttributionBlob = Attribution & {
  fbp?: string;
  fbc?: string;
};

/** Valores longos demais são lixo/ataque — corta pra não inflar o banco. */
const MAX_LEN = 255;

/** Extrai só os parâmetros de atribuição conhecidos, ignorando o resto da URL. */
export function pickAttribution(
  source: URLSearchParams | Record<string, string | string[] | undefined>
): Attribution {
  const get = (key: string): string | undefined => {
    if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
    const v = source[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const out: Attribution = {};
  for (const key of ATTRIBUTION_PARAMS) {
    const value = get(key)?.trim();
    if (value) out[key] = value.slice(0, MAX_LEN);
  }
  return out;
}

/** Anexa a atribuição a um caminho interno, preservando o que já existe nele. */
export function appendAttribution(path: string, attribution: Attribution): string {
  const entries = Object.entries(attribution).filter(([, v]) => v);
  if (!entries.length) return path;

  const [base, existing] = path.split("?");
  const params = new URLSearchParams(existing ?? "");
  for (const [key, value] of entries) {
    if (!params.has(key)) params.set(key, value);
  }
  return `${base}?${params.toString()}`;
}

/** True se houver qualquer parâmetro — evita gravar `{}` no banco. */
export function hasAttribution(attribution: Attribution): boolean {
  return Object.keys(attribution).length > 0;
}

/**
 * Reconstrói o `_fbc` a partir do `fbclid` quando o cookie do Pixel não existe
 * (formato exigido pela Meta: `fb.1.<timestamp_ms>.<fbclid>`). Melhora bastante a
 * correspondência de quem veio de anúncio do Facebook/Instagram.
 */
export function buildFbcFromFbclid(fbclid: string | undefined, now = Date.now()): string | undefined {
  if (!fbclid) return undefined;
  return `fb.1.${now}.${fbclid}`;
}
