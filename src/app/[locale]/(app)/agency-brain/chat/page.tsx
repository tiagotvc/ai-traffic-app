"use client";

import { ChatContent } from "@/components/agency-brain/ChatContent";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";

export default function ChatPage() {
  const { clientSlug } = useAgencyBrainClient();
  return <ChatContent clientId={clientSlug} />;
}
