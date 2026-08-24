import { describe, expect, it } from "vitest";

import {
  buildPersonaDraftScoreCheckItems,
  buildPersonaDraftScoreInput,
  computePersonaDraftScore,
  isPersonaDraftScoreCheckOptional
} from "@/lib/persona-draft-score";

const fullInput = (exclusionHints: string) =>
  buildPersonaDraftScoreInput({
    manualMode: false,
    businessDescription: "Rastreador veicular por assinatura",
    targetProfile: "Motorista de aplicativo, 30-55 anos",
    behaviors: "Compra acessórios automotivos, pesquisa seguro",
    lifestyleHints: "Passa muitas horas no carro",
    exclusionHints,
    savePersonaName: "Motorista de app",
    suggestion: {},
    personaPreview: {},
    ageMin: 30,
    ageMax: 55,
    gender: "male"
  });

describe("computePersonaDraftScore", () => {
  it("chega a 100 sem exclusões preenchidas", () => {
    expect(computePersonaDraftScore(fullInput(""))).toBe(100);
  });

  it("continua 100 com exclusões preenchidas", () => {
    expect(computePersonaDraftScore(fullInput("estudantes, gamers"))).toBe(100);
  });

  it("ainda penaliza um campo obrigatório em branco", () => {
    const input = { ...fullInput(""), behaviors: "" };
    expect(computePersonaDraftScore(input)).toBeLessThan(100);
  });
});

describe("checklist de exclusões", () => {
  it("marca exclusions como opcional", () => {
    expect(isPersonaDraftScoreCheckOptional("exclusions")).toBe(true);
    expect(isPersonaDraftScoreCheckOptional("business")).toBe(false);
  });

  it("mantém exclusions visível na lista, como lembrete", () => {
    const items = buildPersonaDraftScoreCheckItems(fullInput(""));
    const exclusions = items.find((item) => item.key === "exclusions");
    expect(exclusions).toBeDefined();
    expect(exclusions?.optional).toBe(true);
    expect(exclusions?.complete).toBe(false);
  });

  it("reflete o preenchimento quando informado", () => {
    const items = buildPersonaDraftScoreCheckItems(fullInput("estudantes"));
    expect(items.find((item) => item.key === "exclusions")?.complete).toBe(true);
  });
});
