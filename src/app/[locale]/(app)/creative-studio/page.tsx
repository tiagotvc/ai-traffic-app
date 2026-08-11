import { Suspense } from "react";

import { requireAppShellContext } from "@/lib/api-auth";
import { CreativeStudioTopLevelView } from "@/components/creative-studio/CreativeStudioTopLevelView";
import { RouteLoadingScreen } from "@/components/ui/RouteLoadingScreen";

export default async function CreativeStudioPage() {
  await requireAppShellContext();
  return (
    <Suspense fallback={<RouteLoadingScreen />}>
      <CreativeStudioTopLevelView />
    </Suspense>
  );
}
