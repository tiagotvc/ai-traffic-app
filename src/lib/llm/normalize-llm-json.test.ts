import { describe, expect, it } from "vitest";

import { normalizeAudiencePickRaw, normalizeRankedIdsRaw } from "@/lib/llm/normalize-llm-json";

type RankedIds = { rankedIds: string[] };
type AudiencePick = { title: string; summary: string; name: string; interestIds: string[] };

const ranked = (raw: unknown) => normalizeRankedIdsRaw(raw) as RankedIds;
const pick = (raw: unknown) => normalizeAudiencePickRaw(raw) as AudiencePick;

describe("normalizeRankedIdsRaw", () => {
  it("mantém IDs já em string", () => {
    expect(ranked({ rankedIds: ["6003123", "6003456"] }).rankedIds).toEqual(["6003123", "6003456"]);
  });

  it("aceita IDs numéricos (a IA costuma tirar as aspas)", () => {
    expect(ranked({ rankedIds: [6003123, 6003456] }).rankedIds).toEqual(["6003123", "6003456"]);
  });

  it("aceita objetos { id } no lugar de strings", () => {
    expect(ranked({ rankedIds: [{ id: "6003123" }, { id: 6003456 }] }).rankedIds).toEqual([
      "6003123",
      "6003456"
    ]);
  });

  it("desembrulha resposta aninhada e nomes alternativos de campo", () => {
    expect(ranked({ data: { ranked_ids: ["6003123"] } }).rankedIds).toEqual(["6003123"]);
    expect(ranked({ ids: ["6003123"] }).rankedIds).toEqual(["6003123"]);
  });

  it("trunca em 80 em vez de rejeitar quando a IA devolve demais", () => {
    const many = Array.from({ length: 120 }, (_, i) => `600${i}`);
    expect(ranked({ rankedIds: many }).rankedIds).toHaveLength(80);
  });

  it("cai para lista vazia quando o formato é irreconhecível", () => {
    expect(ranked({ rankedIds: null }).rankedIds).toEqual([]);
    expect(ranked("lixo").rankedIds).toEqual([]);
  });
});

describe("normalizeAudiencePickRaw", () => {
  it("preserva os IDs quando title/summary/name faltam", () => {
    const out = pick({ interestIds: ["6003123"] });
    expect(out.interestIds).toEqual(["6003123"]);
    expect(out.title).toBe("");
    expect(out.name).toBe("");
  });

  it("aceita IDs numéricos vindos da IA", () => {
    expect(pick({ interest_ids: [6003123] }).interestIds).toEqual(["6003123"]);
  });
});
