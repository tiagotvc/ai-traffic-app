import { Suspense } from "react";
import { BillingCheckoutClient } from "@/components/billing/BillingCheckoutClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export default function BillingCheckoutPage() {
  return (
    <UxPageMain gap="loose">
      <Suspense fallback={<p className="text-sm text-[var(--text-dim)]">…</p>}>
        <BillingCheckoutClient />
      </Suspense>
    </UxPageMain>
  );
}
