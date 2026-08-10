/**
 * Descrição de origem gravada no campo `description` do público na Meta.
 *
 * Serve para o cliente identificar, no próprio Gerenciador de Anúncios, quais
 * públicos foram criados pelo Orion e a partir de quê. O NOME do público nunca
 * é alterado — permanece exatamente o que o usuário digitou.
 *
 * A string é sempre montada no servidor e nunca aceita do corpo da requisição.
 */

export type AudienceProvenanceKind =
  | "website"
  | "engagement"
  | "combine"
  | "lookalike"
  | "saved";

/** Rótulos em pt-BR: o texto é lido no Gerenciador do cliente, não na UI do app. */
export const AUDIENCE_KIND_LABELS: Record<AudienceProvenanceKind, string> = {
  website: "Público de site",
  engagement: "Público de engajamento",
  combine: "Público combinado",
  lookalike: "Público semelhante",
  saved: "Público salvo"
};

const MAX_DESCRIPTION_LENGTH = 500;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short"
});

export function buildAudienceDescription(input: {
  clientName: string;
  kind: AudienceProvenanceKind;
  /** Detalhes já formatados, ex.: ["Evento: Purchase", "Retenção: 30 dias"]. */
  detail?: string | string[];
  createdAt?: Date;
}): string {
  const parts = [
    "Criado pelo Orion",
    `Cliente: ${input.clientName}`,
    `Tipo: ${AUDIENCE_KIND_LABELS[input.kind]}`
  ];

  const details = Array.isArray(input.detail)
    ? input.detail
    : input.detail
      ? [input.detail]
      : [];
  for (const d of details) {
    const trimmed = d?.trim();
    if (trimmed) parts.push(trimmed);
  }

  parts.push(`Criado em: ${dateFormatter.format(input.createdAt ?? new Date())}`);

  const out = parts.join(" · ");
  return out.length > MAX_DESCRIPTION_LENGTH
    ? `${out.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…`
    : out;
}

/**
 * A Meta rejeita a criação inteira quando um parâmetro não é aceito para
 * determinado subtype. Executa a criação com `description` e, se o erro
 * apontar justamente esse campo, repete uma única vez sem ele — assim um
 * fluxo que funcionava não vira falha dura por causa do rastro de origem.
 */
export async function createWithDescriptionFallback<T>(
  create: (description?: string) => Promise<T>,
  description: string
): Promise<T> {
  try {
    return await create(description);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/description/i.test(message)) throw err;
    return create(undefined);
  }
}
