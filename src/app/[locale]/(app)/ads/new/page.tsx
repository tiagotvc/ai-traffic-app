"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useRouter } from "@/i18n/navigation";

export default function AdsNewRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = searchParams.get("client");

  useEffect(() => {
    const qs = new URLSearchParams({ publish: "1" });
    if (client) qs.set("client", client);
    router.replace(`/campaigns?${qs.toString()}`);
  }, [router, client]);

  return null;
}
