import { Suspense } from "react";

import { PersonaCreatorView } from "@/components/audiences/PersonaCreatorView";

export default function PersonaCreatePage() {
  return (
    <Suspense fallback={null}>
      <PersonaCreatorView />
    </Suspense>
  );
}
