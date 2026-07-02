"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

const ENTRANCE_DURATION_MS = 900;

type CheckoutCloseContextValue = {
  setCloseInterceptor: (handler: (() => void) | null) => void;
};

const CheckoutCloseContext = createContext<CheckoutCloseContextValue | null>(null);

export function useCheckoutCloseInterceptor() {
  const context = useContext(CheckoutCloseContext);
  if (!context) throw new Error("Checkout close interceptor requires CheckoutFullScreenShell");
  return context.setCloseInterceptor;
}

/** Casca full-screen do checkout: toca a transição "constelação" na entrada, depois revela o
 * conteúdo com um X fixo pra fechar (volta pra tela anterior, ou dashboard se não houver histórico
 * — ex.: quem chegou direto de um link externo). */
export function CheckoutFullScreenShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [entering, setEntering] = useState(true);
  const [closeInterceptor, setCloseInterceptorState] = useState<(() => void) | null>(null);
  const setCloseInterceptor = useCallback((handler: (() => void) | null) => {
    setCloseInterceptorState(() => handler);
  }, []);
  const closeContext = useMemo(() => ({ setCloseInterceptor }), [setCloseInterceptor]);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntering(false), ENTRANCE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function close() {
    if (closeInterceptor) {
      closeInterceptor();
      return;
    }
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <CheckoutCloseContext.Provider value={closeContext}>
    <div className="relative min-h-screen w-full">
      <OrionTrafficLoadingOverlay open={entering} variant="constellation" minimal title="" />

      <button
        type="button"
        onClick={close}
        aria-label="Fechar"
        className="fixed right-5 top-5 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white"
      >
        <X size={16} strokeWidth={2} />
      </button>

      <div
        className={`min-h-screen w-full transition-opacity duration-300 ${
          entering ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </div>
    </div>
    </CheckoutCloseContext.Provider>
  );
}
