import type { LearningScopeId } from "@/lib/agency-brain/learning-scopes";

export type LearningScopeEntry = {
  id: LearningScopeId;
  iconPath: string;
  activeBg: string;
  activeText: string;
  labelKey: string;
  hintKey: string;
};

export const LEARNING_SCOPE_CATALOG: LearningScopeEntry[] = [
  {
    id: "client",
    iconPath:
      "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    activeBg: "bg-violet-50",
    activeText: "text-violet-900",
    labelKey: "learningScopeClient",
    hintKey: "learningScopeClientHint"
  },
  {
    id: "agency",
    iconPath:
      "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    activeBg: "bg-sky-50",
    activeText: "text-sky-900",
    labelKey: "learningScopeAgency",
    hintKey: "learningScopeAgencyHint"
  },
  {
    id: "market",
    iconPath:
      "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.029-.946-8.284-2.503m0 0A17.919 17.919 0 013 12c0-1.605.42-3.113 1.157-4.418",
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-900",
    labelKey: "learningScopeMarket",
    hintKey: "learningScopeMarketHint"
  }
];
