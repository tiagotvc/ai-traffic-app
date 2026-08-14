import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/public-routes";
import {
  resolveTrialLandingFeature,
  TRIAL_LANDING_FEATURES,
  TRIAL_LANDING_HERO_KEYS
} from "@/lib/marketing/trial-landing-variants";

describe("resolveTrialLandingFeature", () => {
  it("aceita as variantes conhecidas", () => {
    for (const feature of TRIAL_LANDING_FEATURES) {
      expect(resolveTrialLandingFeature(feature)).toBe(feature);
    }
  });

  it("normaliza caixa e espaço, porque a URL do anúncio é digitada à mão", () => {
    expect(resolveTrialLandingFeature(" Cockpit ")).toBe("cockpit");
  });

  it("cai no herói geral quando o valor não existe", () => {
    expect(resolveTrialLandingFeature("cokpit")).toBe("default");
    expect(resolveTrialLandingFeature(undefined)).toBe("default");
    expect(resolveTrialLandingFeature([])).toBe("default");
  });

  it("usa o primeiro valor quando o parâmetro vem repetido", () => {
    expect(resolveTrialLandingFeature(["relatorios", "criativos"])).toBe("relatorios");
  });

  it("toda variante tem chave de herói", () => {
    for (const feature of [...TRIAL_LANDING_FEATURES, "default"] as const) {
      expect(TRIAL_LANDING_HERO_KEYS[feature].headline).toBeTruthy();
      expect(TRIAL_LANDING_HERO_KEYS[feature].sub).toBeTruthy();
    }
  });
});

describe("landing de campanha no middleware", () => {
  // Regressão cara: fora da lista pública, o middleware manda o visitante pro /login e
  // o anúncio inteiro entrega uma tela de senha.
  it("/teste é público", () => {
    expect(isPublicPath("/teste")).toBe(true);
  });
});
