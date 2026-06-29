"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import {
  computePersonaDraftScore,
  EMPTY_PERSONA_DRAFT_SCORE_INPUT,
  type PersonaDraftScoreInput
} from "@/lib/persona-draft-score";
import { BRAIN_PAUSED_KEY } from "@/lib/campaign-creator/orion-brain-utils";

export type PersonaInsightsResult = {
  estimate: { usersLowerBound: number | null; usersUpperBound: number | null };
  segments: { total: number; invalid: { id: string; name: string }[] };
  demographics: { bestAge: string | null };
  competitor?: { adsAnalyzed: number; findings: { title: string; body: string }[] } | null;
  ai: {
    coherenceScore: number;
    summary: string;
    recommendations: { title: string; body: string; severity: "high" | "medium" | "low" }[];
  } | null;
};

type PersonaCreatorScoreContextValue = {
  scoreInput: PersonaDraftScoreInput | null;
  score: number;
  setScoreInput: (input: PersonaDraftScoreInput | null) => void;
  /** Orion Brain — pausa as análises automáticas (persistido). */
  paused: boolean;
  setPaused: (paused: boolean) => void;
  /** Resultado da comparação automática persona × dados reais (alimentado pelo form). */
  insightsResult: PersonaInsightsResult | null;
  setInsightsResult: (result: PersonaInsightsResult | null) => void;
  insightsLoading: boolean;
  setInsightsLoading: (loading: boolean) => void;
};

const PersonaCreatorScoreContext = createContext<PersonaCreatorScoreContextValue | null>(null);

export function PersonaCreatorScoreProvider({ children }: { children: ReactNode }) {
  const [scoreInput, setScoreInputState] = useState<PersonaDraftScoreInput | null>(
    EMPTY_PERSONA_DRAFT_SCORE_INPUT
  );

  const setScoreInput = useCallback((input: PersonaDraftScoreInput | null) => {
    setScoreInputState(input);
  }, []);

  const [paused, setPausedState] = useState(false);
  const [insightsResult, setInsightsResult] = useState<PersonaInsightsResult | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    try {
      setPausedState(window.localStorage.getItem(BRAIN_PAUSED_KEY) === "1");
    } catch {
      setPausedState(false);
    }
  }, []);

  const setPaused = useCallback((next: boolean) => {
    setPausedState(next);
    try {
      window.localStorage.setItem(BRAIN_PAUSED_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const score = useMemo(
    () => (scoreInput ? computePersonaDraftScore(scoreInput) : 0),
    [scoreInput]
  );

  const value = useMemo(
    () => ({
      scoreInput,
      score,
      setScoreInput,
      paused,
      setPaused,
      insightsResult,
      setInsightsResult,
      insightsLoading,
      setInsightsLoading
    }),
    [scoreInput, score, setScoreInput, paused, setPaused, insightsResult, insightsLoading]
  );

  return (
    <PersonaCreatorScoreContext.Provider value={value}>{children}</PersonaCreatorScoreContext.Provider>
  );
}

export function usePersonaCreatorScore() {
  const ctx = useContext(PersonaCreatorScoreContext);
  if (!ctx) {
    throw new Error("usePersonaCreatorScore must be used within PersonaCreatorScoreProvider");
  }
  return ctx;
}

/** Optional hook for forms also used outside the persona creator shell. */
export function usePersonaCreatorScoreOptional() {
  return useContext(PersonaCreatorScoreContext);
}
