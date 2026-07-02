"use client";

import { useEffect, useState } from "react";

type CommanderFlags = {
  ready: boolean;
  commander: boolean;
  memory: boolean;
};
const FALLBACK: CommanderFlags = {
  ready: false,
  commander: false,
  memory: false
};

/** Fail-closed: durante o carregamento ou em erro, mantém a experiência anterior. */
export function useCommanderAccess(): CommanderFlags {
  const [flags, setFlags] = useState(FALLBACK);
  useEffect(() => {
    let active = true;
    void fetch("/api/campaign-creator/flags", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((json) => {
        if (!active) return;
        setFlags({
          ready: true,
          commander: json?.commander === true,
          memory: json?.commanderMemory === true
        });
      })
      .catch(() => {
        if (active) setFlags({ ...FALLBACK, ready: true });
      });
    return () => { active = false; };
  }, []);
  return flags;
}
