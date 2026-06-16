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
    throw err;
  }

  return children;
}
