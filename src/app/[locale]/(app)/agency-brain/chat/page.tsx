"use client";

import { AgencyBrainClientGate } from "@/components/agency-brain/AgencyBrainClientGate";
import { ChatContent } from "@/components/agency-brain/ChatContent";

export default function ChatPage() {
  return (
    <AgencyBrainClientGate>
      {(clientSlug) => <ChatContent clientId={clientSlug} />}
    </AgencyBrainClientGate>
  );
}
