import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/public-routes";
import {
  DEFAULT_TRIAL_LANDING_FEATURE,
  resolveTrialLandingFeature,
  TRIAL_LANDING_FEATURES,
  TRIAL_LANDING_MEDIA
} from "@/lib/marketing/trial-landing-variants";
import ptBR from "../../../messages/pt-BR.json";
import en from "../../../messages/en.json";

describe("resolveTrialLandingFeature", () => {
  it("aceita as variantes conhecidas", () => {
    for (const feature of TRIAL_LANDING_FEATURES) {
      expect(resolveTrialLandingFeature(feature)).toBe(feature);
    }
  });

  it("normaliza caixa e espaço, porque a URL do anúncio é digitada à mão", () => {
    expect(resolveTrialLandingFeature(" Cockpit ")).toBe("cockpit");
  });

  it("cai na variante padrão quando o valor não existe", () => {
    expect(resolveTrialLandingFeature("cokpit")).toBe(DEFAULT_TRIAL_LANDING_FEATURE);
    expect(resolveTrialLandingFeature(undefined)).toBe(DEFAULT_TRIAL_LANDING_FEATURE);
    expect(resolveTrialLandingFeature([])).toBe(DEFAULT_TRIAL_LANDING_FEATURE);
  });

  it("usa o primeiro valor quando o parâmetro vem repetido", () => {
    expect(resolveTrialLandingFeature(["relatorios", "criativos"])).toBe("relatorios");
  });

  it("toda variante tem imagem, que também serve de poster do vídeo", () => {
    for (const feature of TRIAL_LANDING_FEATURES) {
      expect(TRIAL_LANDING_MEDIA[feature].image).toMatch(/^\/examples\//);
    }
  });

  // Vídeo sem mp4 quebraria no Safari mais velho, e sem poster a moldura fica preta
  // enquanto carrega. Vale quando a filmagem entrar.
  it("variante com vídeo declara mp4", () => {
    for (const feature of TRIAL_LANDING_FEATURES) {
      const video = TRIAL_LANDING_MEDIA[feature].video;
      if (video) expect(video.mp4).toMatch(/\.mp4$/);
    }
  });
});

// A variante monta as chaves em tempo de execução (`variants.${feature}.title`), então
// erro de digitação ou tradução faltando só apareceria abrindo a página. Aqui aparece
// no teste.
const VARIANT_KEYS = [
  "metaTitle",
  "metaDescription",
  "eyebrow",
  "title",
  "subtitle",
  "imageAlt",
  "noteTitle",
  "noteBody",
  "proofEyebrow",
  "proofTitle",
  "proofBody",
  "proofItem1",
  "proofItem2",
  "proofItem3"
] as const;

describe("mensagens das variantes", () => {
  for (const [locale, messages] of [
    ["pt-BR", ptBR],
    ["en", en]
  ] as const) {
    it(`${locale} tem todas as chaves das três variantes`, () => {
      const variants = (messages as Record<string, any>).trialLanding.variants;
      for (const feature of TRIAL_LANDING_FEATURES) {
        for (const key of VARIANT_KEYS) {
          expect(variants[feature]?.[key], `${locale} → ${feature}.${key}`).toBeTruthy();
        }
      }
    });
  }
});

describe("landing de campanha no middleware", () => {
  // Regressão cara: fora da lista pública, o middleware manda o visitante pro /login e
  // o anúncio inteiro entrega uma tela de senha.
  it("/teste é público", () => {
    expect(isPublicPath("/teste")).toBe(true);
  });
});
