"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

function isExemptPath(pathname: string): boolean {
  return (
    pathname.includes("/clients/new") ||
    pathname.includes("/settings") ||
    pathname.includes("/login") ||
    pathname.includes("/billing")
  );
}

/**
 * Redireciona usuários sem clientes reais para o cadastro do primeiro cliente.
 */
export function FirstConnectionGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isExemptPath(pathname)) return;

    let active = true;

    function check() {
      fetch(`/api/onboarding/state?_=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (!active || !j?.ok || j.hasRealClients) return;
          router.replace("/clients/new");
        })
        .catch(() => {});
    }

    check();

    const onReload = () => check();
    window.addEventListener("traffic:campaigns-reload", onReload);

    return () => {
      active = false;
      window.removeEventListener("traffic:campaigns-reload", onReload);
    };
  }, [pathname, router]);

  return null;
}
