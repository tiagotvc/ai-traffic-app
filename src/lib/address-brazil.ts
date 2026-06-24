/** Pure helpers to normalize messy Brazilian address input (no I/O). */

export type ViaCepParts = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

export type ParsedBrazilianAddress = {
  userInput: string;
  cepDigits: string | null;
  cepFormatted: string | null;
  streetNumber: string | null;
  complement: string | null;
  /** Best-effort normalized single-line address for geocoding / display */
  normalized: string;
  geocodeQueries: string[];
};

const STREET_ABBREV: Array<[RegExp, string]> = [
  [/\bav\.?\s+/gi, "Avenida "],
  [/\br\.?\s+/gi, "Rua "],
  [/\brua\s+/gi, "Rua "],
  [/\bavenida\s+/gi, "Avenida "],
  [/\bal\.?\s+/gi, "Alameda "],
  [/\btrav\.?\s+/gi, "Travessa "],
  [/\best\.?\s+/gi, "Estrada "],
  [/\brod\.?\s+/gi, "Rodovia "]
];

const COMPLEMENT_SPLIT =
  /\s*-\s*(?:bloco|bl\.?|sala|sl\.?|andar|conj\.?|conjunto|loja|apto|apartamento|cj\.?)\b.*$/i;

export function extractBrazilCep(text: string): string | null {
  const match = text.match(/\b(\d{5})-?(\d{3})\b/);
  if (!match) return null;
  return `${match[1]}${match[2]}`;
}

export function formatBrazilCep(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 8) return digits;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function extractStreetNumber(text: string): string | null {
  const patterns = [
    /,\s*n[º°o.]?\s*(\d{1,6})\b/i,
    /,\s*(\d{1,6})\b/,
    /\bn[º°o.]?\s*(\d{1,6})\b/i,
    /\b(\d{1,6})\s*-(?=\s*(?:bloco|bl\.?|sala|sl\.?|andar|conj|loja|apto|apartamento)\b)/i
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function extractComplement(text: string): string | null {
  const m = text.match(
    /\s*-\s*((?:bloco|bl\.?|sala|sl\.?|andar|conj\.?|conjunto|loja|apto|apartamento|cj\.?)\b[^,]*)/i
  );
  return m?.[1]?.trim() || null;
}

export function expandStreetAbbreviations(text: string): string {
  let out = text;
  for (const [re, rep] of STREET_ABBREV) {
    out = out.replace(re, rep);
  }
  return out.replace(/\s+/g, " ").trim();
}

export function stripComplementForGeocode(text: string): string {
  return text.replace(COMPLEMENT_SPLIT, "").replace(/\s+/g, " ").trim();
}

function parseCityUfFromTail(text: string): { city: string | null; uf: string | null } {
  const ufMatch = text.match(/\b([A-Z]{2})\b\s*,?\s*\d{5}-?\d{3}\s*$/i);
  const uf = ufMatch?.[1]?.toUpperCase() ?? null;
  const withoutCep = text.replace(/\d{5}-?\d{3}\s*$/, "").trim();
  const parts = withoutCep.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]!;
    if (uf && last.toUpperCase() === uf && parts.length >= 3) {
      return { city: parts[parts.length - 2]!, uf };
    }
    if (/^[A-Z]{2}$/i.test(last) && parts.length >= 2) {
      return { city: parts[parts.length - 2]!, uf: last.toUpperCase() };
    }
  }
  return { city: null, uf };
}

export function buildNormalizedFromViaCep(
  via: ViaCepParts,
  streetNumber: string | null,
  complement: string | null
): string {
  const cep = formatBrazilCep(via.cep);
  const streetPart = [via.logradouro, streetNumber].filter(Boolean).join(", ");
  const withComplement = complement ? `${streetPart} - ${complement}` : streetPart;
  return `${withComplement} - ${via.bairro}, ${via.localidade} - ${via.uf}, ${cep}`;
}

export function buildGeocodeQueries(args: {
  normalized: string;
  via?: ViaCepParts | null;
  streetNumber: string | null;
}): string[] {
  const out: string[] = [];
  const push = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t) out.push(t);
  };

  push(stripComplementForGeocode(args.normalized));
  push(args.normalized);

  if (args.via) {
    const { logradouro, bairro, localidade, uf } = args.via;
    const n = args.streetNumber;
    if (n) {
      push(`${logradouro} ${n}, ${bairro}, ${localidade}, ${uf}, Brasil`);
      push(`${logradouro}, ${n}, ${bairro}, ${localidade}, ${uf}, Brasil`);
    }
    push(`${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`);
    push(`${bairro}, ${localidade}, ${uf}, Brasil`);
    push(`${localidade}, ${uf}, Brasil`);
  }

  return [...new Set(out)];
}

/** Turn free-form user text into normalized address + geocode query candidates. */
export function parseBrazilianAddressInput(raw: string, viaCep?: ViaCepParts | null): ParsedBrazilianAddress {
  const userInput = raw.trim();
  const expanded = expandStreetAbbreviations(userInput);
  const cepDigits = extractBrazilCep(expanded);
  const cepFormatted = cepDigits ? formatBrazilCep(cepDigits) : null;
  const streetNumber = extractStreetNumber(expanded);
  const complement = extractComplement(expanded);

  let normalized = expanded;

  if (viaCep) {
    normalized = buildNormalizedFromViaCep(
      { ...viaCep, cep: cepDigits ?? viaCep.cep },
      streetNumber,
      complement
    );
  } else if (cepFormatted) {
    const { city, uf } = parseCityUfFromTail(expanded);
    const withoutCep = expanded.replace(/\d{5}-?\d{3}\s*$/, "").trim();
    const streetGuess = stripComplementForGeocode(withoutCep.split(/\s*-\s*/)[0] ?? withoutCep);
    if (city && uf) {
      normalized = `${streetGuess}${cepFormatted ? `, ${cepFormatted}` : ""} - ${city} - ${uf}`;
    }
  }

  normalized = normalized.replace(/\s+/g, " ").trim();

  return {
    userInput,
    cepDigits,
    cepFormatted,
    streetNumber,
    complement,
    normalized,
    geocodeQueries: buildGeocodeQueries({
      normalized,
      via: viaCep ?? null,
      streetNumber
    })
  };
}
