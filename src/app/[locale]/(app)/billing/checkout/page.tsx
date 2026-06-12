import { Suspense } from "react";
import { BillingCheckoutClient } from "@/components/billing/BillingCheckoutClient";

export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">…</p>}>
      <BillingCheckoutClient />
    </Suspense>
  );
}
