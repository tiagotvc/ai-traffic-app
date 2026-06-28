import { BillingPlansClient } from "@/components/billing/BillingPlansClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export default function BillingPlansPage() {
  return (
    <UxPageMain gap="loose">
      <BillingPlansClient />
    </UxPageMain>
  );
}
