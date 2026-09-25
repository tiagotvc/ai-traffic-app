import { describe, expect, it } from "vitest";

import { markDuplicates, planLookalikeAudiences, planVideoViewAudiences, summarizePlan } from "./builders";
import {
  buildLookalikeAudienceName,
  buildVideoViewAudienceName,
  parseVideoViewAudienceName
} from "./naming";
import { LOOKALIKE_PRESETS, VIDEO_VIEW_PRESETS, matchLookalikePresetSeeds } from "./presets";
import { LookalikeConfigSchema, VideoViewConfigSchema } from "./types";

describe("AudienceNamingService", () => {
  it("monta o nome de View Vídeo no padrão da agência", () => {
    expect(
      buildVideoViewAudienceName({ videoLabel: "ANÚNCIO 01", percent: 50, retentionDays: 30 })
    ).toBe("[M] - View Vídeo - ANÚNCIO 01 - 50% - 30D");
  });

  it("monta o Lookalike sem duplicar o prefixo do público-base", () => {
    expect(
      buildLookalikeAudienceName({
        seedName: "[M] - View Vídeo - ANÚNCIO 01 - 50% - 90D",
        ratioPercent: 1,
        country: "br"
      })
    ).toBe("[M] - LAL - View Vídeo - ANÚNCIO 01 - 50% - 90D - 1% - BR");
  });

  it("lê de volta o nome de View Vídeo", () => {
    expect(parseVideoViewAudienceName("[M] - View Vídeo - Promo - Julho - 75% - 180D")).toEqual({
      videoLabel: "Promo - Julho",
      percent: 75,
      retentionDays: 180
    });
    expect(parseVideoViewAudienceName("Compradores 30D")).toBeNull();
  });
});

describe("VideoViewBuilder", () => {
  it("gera vídeos × percentuais × retenções (2 × 3 × 5 = 30)", () => {
    const config = VideoViewConfigSchema.parse({
      kind: "video_view",
      videos: [
        { id: "v1", label: "A" },
        { id: "v2", label: "B" }
      ],
      cells: VIDEO_VIEW_PRESETS[0]!.cells
    });
    const plan = planVideoViewAudiences(config);
    expect(plan).toHaveLength(30);
    expect(new Set(plan.map((p) => p.key)).size).toBe(30);
    expect(plan[0]!.name).toBe("[M] - View Vídeo - A - 50% - 30D");
  });

  it("rejeita percentual ou retenção fora da lista", () => {
    expect(
      VideoViewConfigSchema.safeParse({
        kind: "video_view",
        videos: [{ id: "v1", label: "A" }],
        cells: [{ percent: 60, retentionDays: 30 }]
      }).success
    ).toBe(false);
  });
});

describe("LookalikeBuilder", () => {
  it("gera um público por percentual e ignora seed fora da conta", () => {
    const config = LookalikeConfigSchema.parse({
      kind: "lookalike",
      country: "BR",
      seeds: [
        { id: "s1", ratios: [3, 1, 2] },
        { id: "fora", ratios: [1] }
      ]
    });
    const plan = planLookalikeAudiences(
      config,
      new Map([["s1", "[M] - View Vídeo - ANÚNCIO 01 - 50% - 90D"]])
    );
    expect(plan.map((p) => p.name)).toEqual([
      "[M] - LAL - View Vídeo - ANÚNCIO 01 - 50% - 90D - 1% - BR",
      "[M] - LAL - View Vídeo - ANÚNCIO 01 - 50% - 90D - 2% - BR",
      "[M] - LAL - View Vídeo - ANÚNCIO 01 - 50% - 90D - 3% - BR"
    ]);
  });
});

describe("duplicidade", () => {
  it("marca o que já existe na conta e o que se repete no lote", () => {
    const plan = planVideoViewAudiences({
      kind: "video_view",
      videos: [
        { id: "v1", label: "Mesmo" },
        { id: "v2", label: "mesmo" }
      ],
      cells: [
        { percent: 50, retentionDays: 30 },
        { percent: 95, retentionDays: 365 }
      ]
    });
    const marked = markDuplicates(plan, ["[M]  -  View Vídeo - MESMO - 50% - 30D"]);
    expect(marked.map((m) => m.skip)).toEqual(["exists", undefined, "exists", "batch_duplicate"]);
    expect(summarizePlan(marked)).toEqual({
      total: 4,
      toCreate: 1,
      existing: 2,
      batchDuplicates: 1
    });
  });
});

describe("presets", () => {
  it("preset de Lookalike acha os públicos-base pelas origens 50/90, 75/180, 95/365", () => {
    const ids = matchLookalikePresetSeeds(LOOKALIKE_PRESETS[0]!, [
      { id: "a", name: "[M] - View Vídeo - X - 50% - 90D" },
      { id: "b", name: "[M] - View Vídeo - X - 50% - 30D" },
      { id: "c", name: "[M] - View Vídeo - X - 95% - 365D" },
      { id: "d", name: "Lista de clientes" }
    ]);
    expect(ids).toEqual(["a", "c"]);
  });
});
