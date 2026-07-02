import { Suspense } from "react";
import { BillingCheckoutClient } from "@/components/billing/BillingCheckoutClient";
import { CheckoutFullScreenShell } from "@/components/billing/CheckoutFullScreenShell";

export default function BillingCheckoutPage() {
  return (
    <CheckoutFullScreenShell>
      <div className="mx-auto w-full max-w-[110rem] px-6 py-10 sm:py-14">
        <Suspense fallback={<p className="text-sm text-[var(--text-dim)]">…</p>}>
          <BillingCheckoutClient />
        </Suspense>
      </div>
    </CheckoutFullScreenShell>
  );
}
