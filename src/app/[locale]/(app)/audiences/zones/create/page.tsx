import { Suspense } from "react";

import { ZoneCreatorView } from "@/components/audiences/ZoneCreatorView";

export default function ZoneCreatePage() {
  return (
    <Suspense fallback={null}>
      <ZoneCreatorView />
    </Suspense>
  );
}
