import { MVP_SCIENTIST_IDS, SCIENTIST_CREDITS } from "@/lib/labs/types";

export type ScientistCatalogEntry = {
  id: (typeof MVP_SCIENTIST_IDS)[number];
  credits: number;
  /** Tailwind gradient classes for card background */
  gradient: string;
  /** Accent for icon badge and selected ring */
  accent: string;
  /** SVG path (viewBox 0 0 24 24) */
  iconPath: string;
  nameKey: string;
  /** One-line tagline on the card */
  briefKey: string;
  /** Tooltip — outcome-focused, no methodology */
  descKey: string;
  /** Marketing vs data discipline */
  roleKey: string;
};

export const SCIENTIST_CATALOG: ScientistCatalogEntry[] = [
  {
    id: "competitor",
    credits: SCIENTIST_CREDITS.competitor,
    gradient: "from-sky-500 via-cyan-500 to-teal-400",
    accent: "ring-sky-400 shadow-sky-200/60",
    iconPath:
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    nameKey: "labsScientistCompetitorName",
    briefKey: "labsScientistCompetitorBrief",
    descKey: "labsScientistCompetitorDesc",
    roleKey: "labsScientistRoleMarketing"
  },
  {
    id: "consumer",
    credits: SCIENTIST_CREDITS.consumer,
    gradient: "from-fuchsia-500 via-violet-500 to-purple-500",
    accent: "ring-fuchsia-400 shadow-fuchsia-200/60",
    iconPath:
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    nameKey: "labsScientistConsumerName",
    briefKey: "labsScientistConsumerBrief",
    descKey: "labsScientistConsumerDesc",
    roleKey: "labsScientistRoleMarketing"
  },
  {
    id: "trend",
    credits: SCIENTIST_CREDITS.trend,
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    accent: "ring-orange-400 shadow-orange-200/60",
    iconPath: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    nameKey: "labsScientistTrendName",
    briefKey: "labsScientistTrendBrief",
    descKey: "labsScientistTrendDesc",
    roleKey: "labsScientistRoleData"
  },
  {
    id: "hypothesis",
    credits: SCIENTIST_CREDITS.hypothesis,
    gradient: "from-emerald-400 via-green-500 to-lime-500",
    accent: "ring-emerald-400 shadow-emerald-200/60",
    iconPath:
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    nameKey: "labsScientistHypothesisName",
    briefKey: "labsScientistHypothesisBrief",
    descKey: "labsScientistHypothesisDesc",
    roleKey: "labsScientistRoleMarketing"
  },
  {
    id: "confidence",
    credits: SCIENTIST_CREDITS.confidence,
    gradient: "from-indigo-500 via-blue-600 to-violet-600",
    accent: "ring-indigo-400 shadow-indigo-200/60",
    iconPath:
      "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    nameKey: "labsScientistConfidenceName",
    briefKey: "labsScientistConfidenceBrief",
    descKey: "labsScientistConfidenceDesc",
    roleKey: "labsScientistRoleData"
  }
];
