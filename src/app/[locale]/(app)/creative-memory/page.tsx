import { Suspense } from "react";

import { CreativeMemoryClient } from "@/components/creative-memory/CreativeMemoryClient";

export default function CreativeMemoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">…</div>}>
      <CreativeMemoryClient />
    </Suspense>
  );
}
