"use client";

import { useSearchParams } from "next/navigation";

import { PersonaCreatorUxPage } from "@/components/audiences/PersonaCreatorUxPage";
import { PersonaFromExistingUxPage } from "@/components/audiences/PersonaFromExistingUxPage";

export function PersonaCreatorView() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  if (mode === "existing") {
    return <PersonaFromExistingUxPage />;
  }

  return <PersonaCreatorUxPage />;
}
