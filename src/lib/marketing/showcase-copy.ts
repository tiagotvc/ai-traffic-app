export type ShowcaseCopy = {
  live: string;
  kpis: ReadonlyArray<{ id: string; label: string; value: string }>;
  brain: string;
  brainHint: string;
  creative: string;
  creativeExample: string;
  creativeTag: string;
};

type ShowcaseTranslator = (key: string) => string;

/** Resolve showcase strings on the server (or pass `useTranslations("auth")`). */
export function buildShowcaseCopy(t: ShowcaseTranslator): ShowcaseCopy {
  return {
    live: t("showcaseLive"),
    kpis: [
      { id: "roas", label: t("showcaseKpiRoas"), value: "—" },
      { id: "ctr", label: t("showcaseKpiCtr"), value: "—" },
      { id: "cpa", label: t("showcaseKpiCpa"), value: "—" }
    ],
    brain: t("showcaseBrain"),
    brainHint: t("showcaseBrainHint"),
    creative: t("showcaseCreative"),
    creativeExample: t("showcaseCreativeExample"),
    creativeTag: t("showcaseCreativeTag")
  };
}
