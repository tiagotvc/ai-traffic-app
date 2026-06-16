import { redirect as nextRedirect } from "next/navigation";

import { getAppShellContext } from "@/lib/app-shell-context";
import { SubscriptionSuspendedError } from "@/lib/billing/entitlements";

export async function AppShellData({
  children,
  locale
}: {
  children: React.ReactNode;
  locale: string;
}) {
  try {
    await getAppShellContext();
  } catch (err) {
    if (err instanceof SubscriptionSuspendedError) {
      nextRedirect(`/${locale}/login?error=account_suspended`);
    }
    // DB lento/indisponível: não derruba o shell — a página client tenta carregar via API.
    // eslint-disable-next-line no-console
    console.error("[AppShellData] context unavailable:", err);
  }

  return children;
}
