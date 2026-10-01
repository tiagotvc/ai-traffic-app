import { describe, expect, it } from "vitest";

import {
  lookalikeSpecKey,
  markDuplicates,
  markExistingLookalikes,
  planLookalikeAudiences,
  planVideoViewAudiences,
  summarizePlan
} from "./builders";
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
  it("gera 1 público por percentual × retenção com todos os vídeos juntos (3 × 5 = 15)", () => {
    const config = VideoViewConfigSchema.parse({
      kind: "video_view",
      videoIds: ["v1", "v2", "v3", "v1"],
      label: "ANÚNCIO 01",
      cells: VIDEO_VIEW_PRESETS[0]!.cells
    });
    const plan = planVideoViewAudiences(config);
    expect(plan).toHaveLength(15);
    expect(new Set(plan.map((p) => p.key)).size).toBe(15);
    expect(plan[0]!.name).toBe("[M] - View Vídeo - ANÚNCIO 01 - 50% - 30D");
    expect(plan.every((p) => p.videoIds.join() === "v1,v2,v3")).toBe(true);
  });

  it("rejeita percentual ou retenção fora da lista e nome vazio", () => {
    const base = { kind: "video_view", videoIds: ["v1"], label: "A" };
    expect(
      VideoViewConfigSchema.safeParse({ ...base, cells: [{ percent: 60, retentionDays: 30 }] }).success
    ).toBe(false);
    expect(
      VideoViewConfigSchema.safeParse({
        ...base,
        label: "  ",
        cells: [{ percent: 50, retentionDays: 30 }]
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
  it("marca o que já existe na conta, ignorando caixa e espaços", () => {
    const plan = planVideoViewAudiences({
      kind: "video_view",
      videoIds: ["v1", "v2"],
      label: "Mesmo",
      cells: [
        { percent: 50, retentionDays: 30 },
        { percent: 95, retentionDays: 365 }
      ]
    });
    const marked = markDuplicates(plan, ["[M]  -  View Vídeo - MESMO - 50% - 30D"]);
    expect(marked.map((m) => m.skip)).toEqual(["exists", undefined]);
    expect(summarizePlan(marked)).toEqual({ total: 2, toCreate: 1, existing: 1, batchDuplicates: 0 });
  });

  it("marca nome repetido dentro do lote", () => {
    const plan = planLookalikeAudiences(
      { kind: "lookalike", country: "BR", seeds: [{ id: "a", ratios: [1] }, { id: "b", ratios: [1] }] },
      new Map([
        ["a", "Mesmo nome"],
        ["b", "mesmo nome"]
      ])
    );
    expect(markDuplicates(plan, []).map((m) => m.skip)).toEqual([undefined, "batch_duplicate"]);
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

describe("lookalike já existente com outro nome", () => {
  it("lê a chave do lookalike_spec da Meta", () => {
    expect(
      lookalikeSpecKey('{"ratio":0.02,"country":"br","origin":[{"id":"s1","type":"custom_audience"}]}')
    ).toBe("s1:2:BR");
    expect(lookalikeSpecKey({ ratio: 0.01 })).toBeNull();
  });

  it("marca como existente a mesma origem, percentual e país", () => {
    const plan = planLookalikeAudiences(
      { kind: "lookalike", country: "BR", seeds: [{ id: "s1", ratios: [1, 2] }] },
      new Map([["s1", "Base"]])
    );
    const marked = markExistingLookalikes(markDuplicates(plan, []), new Set(["s1:1:BR"]));
    expect(marked.map((m) => m.skip)).toEqual(["exists", undefined]);
  });
});
