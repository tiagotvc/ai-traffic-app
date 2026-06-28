import { BillingAddonsClient } from "@/components/billing/BillingAddonsClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export default function BillingAddonsPage() {
  return (
    <UxPageMain gap="loose">
      <BillingAddonsClient />
    </UxPageMain>
  );
}
