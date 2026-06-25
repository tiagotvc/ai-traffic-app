"use client";

import { Suspense } from "react";

import { ClientsCreateContentLive } from "@/uxpilot-ui/adapters/ClientsCreateContentLive";

export function ClientsCreateView() {
  return (
    <Suspense fallback={null}>
      <ClientsCreateContentLive />
    </Suspense>
  );
}
