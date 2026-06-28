import { ReportsScheduleClient } from "@/components/reports/ReportsScheduleClient";
import { UxPageMain } from "@/uxpilot-ui/adapters/UxPageMain";

export function ReportsScheduleView() {
  return (
    <UxPageMain gap="loose">
      <ReportsScheduleClient />
    </UxPageMain>
  );
}
