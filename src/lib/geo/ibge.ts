import "server-only";

/**
 * IBGE — API pública de localidades (sem key). Valida se um MUNICÍPIO existe e
 * retorna UF/região. Renda por bairro NÃO é exposta de forma confiável pelo IBGE
 * (mapear bairro↔setor censitário é impreciso) — por isso ficamos em município.
 */
export type IbgeMunicipio = { id: number; nome: string; uf: string; regiao: string };

let cache: IbgeMunicipio[] | null = null;

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function loadMunicipios(): Promise<IbgeMunicipio[]> {
  if (cache) return cache;
  try {
    const r = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios", {
      // cache de 1 dia (lista é estável)
      next: { revalidate: 86400 }
    } as RequestInit);
    if (!r.ok) return [];
    const data = (await r.json()) as Array<{
      id: number;
      nome: string;
      microrregiao?: { mesorregiao?: { UF?: { sigla?: string; regiao?: { nome?: string } } } };
    }>;
    cache = data.map((m) => ({
      id: m.id,
      nome: m.nome,
      uf: m.microrregiao?.mesorregiao?.UF?.sigla ?? "",
      regiao: m.microrregiao?.mesorregiao?.UF?.regiao?.nome ?? ""
    }));
    return cache;
  } catch {
    return [];
  }
}

/** Encontra um município pelo nome (acento-insensível; aceita "Cidade - UF"). */
export async function findMunicipio(name: string): Promise<IbgeMunicipio | null> {
  const cityPart = name.split(/[-,/]/)[0] ?? name;
  const n = norm(cityPart);
  if (!n) return null;
  const list = await loadMunicipios();
  if (!list.length) return null;
  return (
    list.find((m) => norm(m.nome) === n) ??
    (n.length > 3 ? (list.find((m) => norm(m.nome).includes(n)) ?? null) : null)
  );
}
