"use client";

import { useEffect, useState } from "react";

export type CommanderMemoryCampaign = {
  campaignName: string;
  spend: number;
  conversions: number;
  ctr: number;
  cpa: number | null;
  roas: number;
};

type CommanderMemoryState = {
  loading: boolean;
  campaigns: CommanderMemoryCampaign[];
};

const EMPTY: CommanderMemoryState = { loading: false, campaigns: [] };

/** Memória do Brain (benchmarks/histórico real) pro painel do Commander. Falha silenciosa. */
export function useCommanderMemory(clientSlug: string, enabled: boolean): CommanderMemoryState {
  const [state, setState] = useState<CommanderMemoryState>(EMPTY);

  useEffect(() => {
    if (!enabled || !clientSlug.trim()) {
      setState(EMPTY);
      return;
    }

    let active = true;
    setState({ loading: true, campaigns: [] });
    void fetch(`/api/commander/memory?clientSlug=${encodeURIComponent(clientSlug)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!active) return;
        setState({ loading: false, campaigns: json?.ok ? json.campaigns ?? [] : [] });
      })
      .catch(() => {
        if (active) setState({ loading: false, campaigns: [] });
      });

    return () => {
      active = false;
    };
  }, [clientSlug, enabled]);

  return state;
}
