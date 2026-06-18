import { getAppContext } from "@/lib/app-context";
import { LabsComingSoon } from "@/components/labs/LabsComingSoon";
import { LabsContent } from "@/components/labs/LabsContent";
import { isLabsEnabledForUser } from "@/lib/labs/feature-flag";

export default async function LabsPage() {
  const { platformAdmin } = await getAppContext();
  if (!isLabsEnabledForUser(platformAdmin)) {
    return <LabsComingSoon />;
  }
  return <LabsContent />;
}
