"use client";

import { createContext, useContext } from "react";

const HighlightsCanvasViewContext = createContext(false);

export function HighlightsCanvasViewProvider({
  active,
  children
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <HighlightsCanvasViewContext.Provider value={active}>
      {children}
    </HighlightsCanvasViewContext.Provider>
  );
}

export function useHighlightsCanvasView() {
  return useContext(HighlightsCanvasViewContext);
}
