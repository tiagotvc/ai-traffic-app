"use client";

import { useSearchParams } from "next/navigation";

import { AdsCreatorClient } from "@/components/AdsCreatorClient";

export default function AdsNewPage() {
  const searchParams = useSearchParams();
  const client = searchParams.get("client") ?? undefined;

  // Página cheia (não-embedded) — substitui o antigo drawer lateral.
  return <AdsCreatorClient initialClientSlug={client} />;
}
