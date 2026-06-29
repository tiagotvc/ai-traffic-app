"use client";

import { useSearchParams } from "next/navigation";

import { ManualZoneCreatorUxPage } from "@/components/audiences/ManualZoneCreatorUxPage";
import { ZoneCreatorUxPage } from "@/components/audiences/ZoneCreatorUxPage";

export function ZoneCreatorView() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  if (mode === "manual") {
    return <ManualZoneCreatorUxPage />;
  }

  return <ZoneCreatorUxPage />;
}
