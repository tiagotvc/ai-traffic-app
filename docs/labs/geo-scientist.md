# Geo Scientist (criador de zona)

> Cientista `geo` (Labs) que ajuda no **Criador de Zona** via Orion Brain. Valida os lugares vs o
> briefing e analisa a geometria dos pins. Skill: [`geo-skill.ts`](../../src/lib/labs/skills/geo-skill.ts).
> Flag: `scientists.geo`. Endpoint: [`/api/zones/insights`](../../src/app/api/zones/insights/route.ts).

## Implementado

- **Validação por IA** (AI router): para cada lugar → `fit` / `misfit` (não bate com o briefing, ex.:
  bairro nobre quando o critério é "baixa renda", ou bairro que não existe na cidade) / `suggestion`
  (faltou) / `insight`. Com `summary` + `confidence`. Roda **automático** no card Orion Brain (debounce),
  com feedback animado "Geo Scientist · validando a região".
- **✅ Geometria (dado real, sem key)** — Haversine sobre os pins geocodificados:
  - **Sobreposição de raio**: pins cujos círculos se sobrepõem (distância < 60% da soma dos raios) →
    "Sobreposição: A × B" (público duplicado/verba desperdiçada).
  - **Pin isolado**: pin a > 3× a mediana de distância dos demais → "confira se pertence à zona".
  - Funciona **mesmo sem IA**.
- **✅ Coerência socioeconômica (IA)** — o prompt avalia explicitamente se o perfil de renda dos
  bairros bate com o briefing (best-effort; sem afirmar quando incerto). _Não_ é dado IBGE.

- **✅ IBGE — validação de município (grátis, testado)**: [`src/lib/geo/ibge.ts`](../../src/lib/geo/ibge.ts)
  via API pública de localidades → confirma a cidade + UF + região ("Cidade confirmada (IBGE):
  Novo Hamburgo/RS · Sul") ou aponta cidade não encontrada. Testado: `findMunicipio("Novo Hamburgo")`
  → RS/Sul. _Renda por bairro o IBGE não expõe de forma confiável — ficamos em município._
- **✅ Reach estimate (alcance)**: o endpoint usa o `metaAccessToken` do tenant + a 1ª conta real e
  chama o **delivery estimate** da Meta só com `geo_locations.custom_locations` → "Alcance estimado:
  X–Y" no card. Sem seletor de conta (o estimate por geo independe da conta específica).
- **✅ Google Maps — POIs + cidade resolvida (pronto, gated por key)**:
  [`src/lib/geo/google-maps.ts`](../../src/lib/geo/google-maps.ts) — reverse-geocode por pin (cross-check
  "pin fora da cidade-alvo") + Places Text Search (POIs). **No-op sem `GOOGLE_MAPS_API_KEY`**; ativa e
  passa a enriquecer assim que a key entrar no `.env`.

## Bloqueios confirmados (investigados em 2026-06-28)

- **Geocoder = Nominatim/OpenStreetMap** (grátis), `src/lib/geocode-nominatim.ts`. **Não há key Google**
  (`GOOGLE_PLACES/MAPS/GEOCODING` todas vazias no `.env`).
- **Ad Library (searchapi) é country-level** — não dá granularidade de bairro p/ "concorrentes por região".
- **IBGE não tem endpoint confiável "bairro → renda"** (mapear nome de bairro ↔ setor censitário é
  trabalhoso e impreciso). Não vamos fabricar isso.

## Roadmap (o que falta e a dependência REAL de cada um)

| Esteroide | Valor | Dependência |
|---|---|---|
| **Reach estimate por zona** (Meta delivery estimate com `geo_locations`) | "esta zona alcança ~X pessoas" | Precisa de **conta de anúncio** no contexto do criador de zona (hoje zonas são globais, sem ad account). |
| **Renda/demografia (IBGE)** | "este bairro é mesmo de baixa renda?" vira **dado**, não palpite da IA | Fonte nova: **IBGE** (censo por setor/bairro/CEP) — provider + mapeamento. |
| **POIs (Google Places)** | landmarks por tipo de zona (distritos comerciais, shoppings) | **GOOGLE_PLACES_API_KEY**. |
| **Cross-check de geocodificação determinístico** | flag pin que resolveu fora da cidade-alvo | Precisa do **endereço resolvido (cidade/estado)** no pin — hoje `ZoneCustomLocation` só guarda lat/lng/raio/label. (A IA já cobre isso por conhecimento.) |
| **Concorrentes por região** | onde os concorrentes anunciam na região | Cruzar com o Marketing Scientist / Ad Library (já integrada) por região. |
| **Memória + recursivo** | cache por cidade/critério; expandir cidade → bairros | `MarketMemory`-like por geo + orquestração. |

> Honestidade: as 4 primeiras precisam de **fonte/credencial/contexto** que ainda não temos no
> ambiente (ad account no criador de zona, IBGE, Google key, endereço resolvido). A geometria (Fase 1)
> foi feita por ser **real e sem dependência nova**. Cada item acima entra num passe focado quando a
> dependência for liberada.

## Histórico
- 2026-06-28: Geo Scientist (validação IA) + geometria (sobreposição + pin isolado) + coerência de renda.
- 2026-06-29: IBGE (validação de município, testado), reach estimate (Meta delivery por geo) e Google Maps
  (POIs + cidade resolvida, gated por `GOOGLE_MAPS_API_KEY`). Restam só os inviáveis pela fonte:
  concorrentes-por-bairro (Ad Library é country-level) e renda-por-bairro (IBGE não expõe).
