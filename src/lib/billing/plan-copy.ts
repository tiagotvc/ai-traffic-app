/**
 * Nome e descrição dos planos traduzidos.
 *
 * A tabela `plans` guarda `name`/`description` como uma coluna de texto só, em
 * português — o que vazava direto para a vitrine em inglês. A tradução mora aqui,
 * com o valor do banco como reserva para planos que não estejam mapeados (ex.:
 * planos legados ou criados pelo admin).
 */

const PLAN_COPY_KEYS: Record<string, { name: string; description: string }> = {
  free: { name: "planFreeName", description: "planFreeDescription" },
  basic: { name: "planBasicName", description: "planBasicDescription" },
  advanced: { name: "planAdvancedName", description: "planAdvancedDescription" },
  agency: { name: "planAgencyName", description: "planAgencyDescription" }
};

type Translator = (key: string) => string;

/** Base do slug: `advanced-pro`/`basic-plus` reaproveitam a cópia do plano raiz. */
function baseSlug(slug: string): string {
  return slug.split("-")[0] ?? slug;
}

export function planDisplayName(
  slug: string,
  fallback: string,
  t: Translator
): string {
  const key = PLAN_COPY_KEYS[slug]?.name ?? PLAN_COPY_KEYS[baseSlug(slug)]?.name;
  if (!key) return fallback;
  const translated = t(key);
  // next-intl devolve a própria chave quando ela não existe — nesse caso, banco.
  return translated === key ? fallback : translated;
}

export function planDisplayDescription(
  slug: string,
  fallback: string | null | undefined,
  t: Translator
): string | null {
  const key = PLAN_COPY_KEYS[slug]?.description ?? PLAN_COPY_KEYS[baseSlug(slug)]?.description;
  if (!key) return fallback ?? null;
  const translated = t(key);
  return translated === key ? (fallback ?? null) : translated;
}
