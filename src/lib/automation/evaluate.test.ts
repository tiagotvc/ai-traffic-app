import { describe, expect, it } from "vitest";

import {
  aggregateMetricValues,
  dnfHit,
  normalizeWindow,
  windowedHit,
  type DailyMetricRow
} from "@/lib/automation/evaluate";

function row(day: string, overrides: Partial<DailyMetricRow> = {}): DailyMetricRow {
  return {
    day,
    spend: 100,
    conversions: 2,
    impressions: 10000,
    clicks: 150,
    leads: 0,
    roas: 2,
    reach: 4000,
    ...overrides
  };
}

describe("normalizeWindow", () => {
  it("aplica defaults e rejeita janelas fora do conjunto permitido", () => {
    expect(normalizeWindow({})).toEqual({ windowDays: 7, consecutiveDays: 1 });
    expect(normalizeWindow({ windowDays: 3, consecutiveDays: 3 })).toEqual({
      windowDays: 3,
      consecutiveDays: 3
    });
    expect(normalizeWindow({ windowDays: 5 }).windowDays).toBe(7); // 5 não é permitido
    expect(normalizeWindow({ consecutiveDays: 99 }).consecutiveDays).toBe(7); // clamp
  });
});

describe("aggregateMetricValues", () => {
  it("deriva cpm e frequência de impressões/alcance", () => {
    const mv = aggregateMetricValues([row("2026-07-01"), row("2026-07-02")]);
    expect(mv.spend).toBe(200);
    expect(mv.cpm).toBeCloseTo((200 / 20000) * 1000); // R$ 10,00
    expect(mv.frequency).toBeCloseTo(20000 / 8000); // 2.5
    expect(mv.clicks).toBe(300);
    expect(mv.ctr).toBeCloseTo((300 / 20000) * 100); // 1.5%
    expect(mv.cpa).toBeCloseTo(200 / 4);
  });

  it("não divide por zero sem alcance/impressões", () => {
    const mv = aggregateMetricValues([row("2026-07-01", { impressions: 0, reach: 0, clicks: 0 })]);
    expect(mv.cpm).toBe(0);
    expect(mv.frequency).toBe(0);
    expect(mv.ctr).toBe(0);
  });
});

describe("dnfHit", () => {
  it("E dentro do grupo, OU entre grupos", () => {
    const mv = { cpa: 60, roas: 1.2, spend: 500 };
    expect(dnfHit([[{ metric: "cpa", op: "gt", value: 50 }]], mv)).toBe(true);
    expect(
      dnfHit(
        [
          [
            { metric: "cpa", op: "gt", value: 50 },
            { metric: "roas", op: "gt", value: 2 } // falha → grupo cai
          ],
          [{ metric: "spend", op: "gt", value: 400 }] // OU: este grupo salva
        ],
        mv
      )
    ).toBe(true);
    expect(dnfHit([[{ metric: "roas", op: "gt", value: 2 }]], mv)).toBe(false);
  });
});

describe("windowedHit — dias consecutivos", () => {
  const groups = [[{ metric: "cpa", op: "gt", value: 40 }]];

  it("dispara quando a condição vale nos N dias seguidos", () => {
    // CPA diário = spend/conversions = 100/2 = 50 > 40 em todos os dias.
    const rows = ["2026-07-01", "2026-07-02", "2026-07-03"].map((d) => row(d));
    const res = windowedHit({
      rows,
      groups,
      spec: { windowDays: 1, consecutiveDays: 3 },
      endDay: "2026-07-03"
    });
    expect(res.hit).toBe(true);
    expect(res.metricValues.cpa).toBeCloseTo(50);
  });

  it("NÃO dispara se um dos dias da sequência não bateu (um dia bom salva a campanha)", () => {
    const rows = [
      row("2026-07-01"),
      row("2026-07-02", { conversions: 10 }), // CPA 10 → dia bom quebra a sequência
      row("2026-07-03")
    ];
    const res = windowedHit({
      rows,
      groups,
      spec: { windowDays: 1, consecutiveDays: 3 },
      endDay: "2026-07-03"
    });
    expect(res.hit).toBe(false);
  });

  it("NÃO dispara sem dados em um dos dias da sequência (dados esparsos falham seguro)", () => {
    const rows = [row("2026-07-01"), row("2026-07-03")]; // sem 02/07
    const res = windowedHit({
      rows,
      groups,
      spec: { windowDays: 1, consecutiveDays: 3 },
      endDay: "2026-07-03"
    });
    expect(res.hit).toBe(false);
  });

  it("respeita o gasto mínimo dentro da janela", () => {
    const rows = [row("2026-07-03")];
    const res = windowedHit({
      rows,
      groups,
      minSpend: 500,
      spec: { windowDays: 1, consecutiveDays: 1 },
      endDay: "2026-07-03"
    });
    expect(res.hit).toBe(false);
  });

  it("janela móvel agrega os dias da janela (windowDays 3)", () => {
    // 3 dias × spend 100 / (3 × 2 conv) = CPA 50 > 40 → dispara.
    const rows = ["2026-07-01", "2026-07-02", "2026-07-03"].map((d) => row(d));
    const res = windowedHit({
      rows,
      groups,
      spec: { windowDays: 3, consecutiveDays: 1 },
      endDay: "2026-07-03"
    });
    expect(res.hit).toBe(true);
    expect(res.metricValues.spend).toBe(300);
  });
});
