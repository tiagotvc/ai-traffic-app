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

import type { PeriodState } from "@/components/PeriodFilter";

type ClientOption = { slug: string; name: string };
type AdAccountOpt = { id: string; label: string };

export type CommandStripPageConfig = {
  hideFilters?: boolean;
  hideSync?: boolean;
  periodFilterDisabled?: boolean;
  periodFilterDisabledHint?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  leadingSlot?: ReactNode;
  middleTrailingSlot?: ReactNode;
  trailingSlot?: ReactNode;
};

type CommandStripContextValue = {
  clientFilter: string;
  setClientFilter: (value: string) => void;
  accountFilter: string;
  setAccountFilter: (value: string) => void;
  period: PeriodState;
  setPeriod: (value: PeriodState) => void;
  clientOptions: ClientOption[];
  adAccounts: AdAccountOpt[];
  setAdAccounts: (accounts: AdAccountOpt[]) => void;
  isEmptyState: boolean;
  setIsEmptyState: (value: boolean) => void;
  showEmptyToggle: boolean;
  setShowEmptyToggle: (value: boolean) => void;
  pageConfig: CommandStripPageConfig;
  setPageConfig: (
    value: CommandStripPageConfig | ((prev: CommandStripPageConfig) => CommandStripPageConfig)
  ) => void;
};

const CommandStripContext = createContext<CommandStripContextValue | null>(null);

export function CommandStripProvider({ children }: { children: ReactNode }) {
  const [clientFilter, setClientFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [period, setPeriod] = useState<PeriodState>({
    preset: "last30",
    since: "",
    until: ""
  });
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccountOpt[]>([]);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [showEmptyToggle, setShowEmptyToggle] = useState(false);
  const [pageConfig, setPageConfig] = useState<CommandStripPageConfig>({});

  const setClientFilterWrapped = useCallback((value: string) => {
    setClientFilter(value);
    setAccountFilter("");
  }, []);

  const setAdAccountsStable = useCallback((accounts: AdAccountOpt[]) => {
    setAdAccounts((prev) => {
      if (
        prev.length === accounts.length &&
        prev.every((p, i) => p.id === accounts[i]?.id && p.label === accounts[i]?.label)
      ) {
        return prev;
      }
      return accounts;
    });
  }, []);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then(async (r) => {
        const text = await r.text();
        try {
          return JSON.parse(text) as { clients?: ClientOption[] };
        } catch {
          return { clients: [] };
        }
      })
      .then((j) => setClientOptions(j.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientFilter) {
      setAdAccountsStable([]);
      return;
    }
    fetch(`/api/meta/ad-accounts?clientId=${encodeURIComponent(clientFilter)}`)
      .then((r) => r.json())
      .then((j: { accounts?: { metaAdAccountId: string; label: string }[] }) => {
        setAdAccountsStable(
          (j.accounts ?? []).map((a) => ({ id: a.metaAdAccountId, label: a.label }))
        );
      })
      .catch(() => setAdAccountsStable([]));
  }, [clientFilter, setAdAccountsStable]);

  const value = useMemo(
    () => ({
      clientFilter,
      setClientFilter: setClientFilterWrapped,
      accountFilter,
      setAccountFilter,
      period,
      setPeriod,
      clientOptions,
      adAccounts,
      setAdAccounts: setAdAccountsStable,
      isEmptyState,
      setIsEmptyState,
      showEmptyToggle,
      setShowEmptyToggle,
      pageConfig,
      setPageConfig
    }),
    [
      clientFilter,
      setClientFilterWrapped,
      accountFilter,
      period,
      clientOptions,
      adAccounts,
      isEmptyState,
      showEmptyToggle,
      pageConfig,
      setAdAccountsStable
    ]
  );

  return <CommandStripContext.Provider value={value}>{children}</CommandStripContext.Provider>;
}

export function useCommandStrip() {
  const ctx = useContext(CommandStripContext);
  if (!ctx) {
    throw new Error("useCommandStrip must be used within CommandStripProvider");
  }
  return ctx;
}

export function useCommandStripOptional() {
  return useContext(CommandStripContext);
}
