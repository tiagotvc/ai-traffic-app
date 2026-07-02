import { Suspense } from "react";

import { AutomationRuleCreatorView } from "@/components/automations/AutomationRuleCreatorView";

export default function AutomationRuleCreatePage() {
  return (
    <Suspense fallback={null}>
      <AutomationRuleCreatorView />
    </Suspense>
  );
}
