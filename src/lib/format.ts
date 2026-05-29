function localeTag(locale?: string) {
  return locale === "en" ? "en-US" : "pt-BR";
}

export function formatBRL(value: number, locale?: string) {
  return value.toLocaleString(localeTag(locale), { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number, locale?: string) {
  return value.toLocaleString(localeTag(locale));
}

export function formatPercent(value: number, digits = 1, locale?: string) {
  const n = value.toFixed(digits);
  return locale === "en" ? `${n}%` : `${n.replace(".", ",")}%`;
}

export function formatRoas(value: number, locale?: string) {
  const n = value.toFixed(1);
  return locale === "en" ? `${n}x` : `${n.replace(".", ",")}x`;
}
