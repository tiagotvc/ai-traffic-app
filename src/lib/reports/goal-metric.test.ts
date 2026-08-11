import { describe, expect, it } from "vitest";

import type { MetricKey } from "@/lib/dashboard-metrics";
import { BUILTIN_REPORT_TEMPLATES } from "@/lib/reports/templates";
import { goalMetricFromSelection } from "@/lib/reports/goal-metric";

const m = (...keys: string[]) => keys as MetricKey[];

describe("goalMetricFromSelection", () => {
  it("elege mensagens no recorte de campanha de conversa", () => {
    expect(goalMetricFromSelection(m("messages", "cpmsg", "spend", "ctr"))).toBe("messages");
  });

  it("prefere mensagens a conversões quando as duas estão no recorte", () => {
    expect(goalMetricFromSelection(m("conversions", "messages", "spend"))).toBe("messages");
  });

  it("cai em conversões quando não há mensagens", () => {
    expect(goalMetricFromSelection(m("spend", "conversions", "cpa", "roas"))).toBe("conversions");
  });

  it("usa cliques como último recurso", () => {
    expect(goalMetricFromSelection(m("spend", "ctr", "clicks", "cpc"))).toBe("clicks");
  });

  it("devolve null quando o recorte não sinaliza resultado, deixando o servidor decidir", () => {
    expect(goalMetricFromSelection(m("spend", "impressions", "reach", "cpm"))).toBeNull();
  });

  it("não deduz meta a partir de métrica de custo do resultado", () => {
    // cpmsg/cpa medem o custo da meta, não são a meta em si.
    expect(goalMetricFromSelection(m("cpmsg", "cpa", "spend"))).toBeNull();
  });

  it("o template de WhatsApp resolve para mensagens, não para conversões", () => {
    const whatsapp = BUILTIN_REPORT_TEMPLATES.find((t) => t.id === "whatsapp");
    expect(whatsapp?.metrics).toBeDefined();
    expect(goalMetricFromSelection(whatsapp!.metrics!)).toBe("messages");
  });

  it("o template de alertas não força meta: é recorte de custo/eficiência", () => {
    // spend/cpa/ctr/frequency descrevem o que exige atenção, não o resultado. Sem métrica
    // de resultado no recorte, quem decide a meta continua sendo o servidor (preset da
    // campanha + objetivo do cliente), que é o comportamento correto aqui.
    const alerts = BUILTIN_REPORT_TEMPLATES.find((t) => t.id === "alerts");
    expect(alerts?.metrics).toBeDefined();
    expect(goalMetricFromSelection(alerts!.metrics!)).toBeNull();
  });

  it("os demais templates single com métrica de resultado resolvem sozinhos", () => {
    const resolved = BUILTIN_REPORT_TEMPLATES.filter(
      (tpl) => tpl.kind === "single" && tpl.metrics && goalMetricFromSelection(tpl.metrics)
    ).map((tpl) => [tpl.id, goalMetricFromSelection(tpl.metrics!)]);

    expect(resolved).toEqual([
      ["performance", "conversions"],
      ["executive", "conversions"],
      ["monthly", "conversions"],
      ["creatives", "conversions"],
      ["whatsapp", "messages"]
    ]);
  });
});
