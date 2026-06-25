"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AppBuilderChromeContextValue = {
  immersive: boolean;
  setImmersive: (value: boolean) => void;
};

const AppBuilderChromeContext = createContext<AppBuilderChromeContextValue>({
  immersive: false,
  setImmersive: () => {}
});

export function AppBuilderChromeProvider({ children }: { children: React.ReactNode }) {
  const [immersive, setImmersiveState] = useState(false);

  const setImmersive = useCallback((value: boolean) => {
    setImmersiveState(value);
  }, []);

  const value = useMemo(() => ({ immersive, setImmersive }), [immersive, setImmersive]);

  return (
    <AppBuilderChromeContext.Provider value={value}>{children}</AppBuilderChromeContext.Provider>
  );
}

export function useAppBuilderChrome() {
  return useContext(AppBuilderChromeContext);
}

/** Hide the app sidebar and expand the builder to full viewport while active. */
export function useAppBuilderImmersive(active: boolean) {
  const { setImmersive } = useAppBuilderChrome();

  useEffect(() => {
    setImmersive(active);
    return () => setImmersive(false);
  }, [active, setImmersive]);
}
