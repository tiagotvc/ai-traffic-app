"use client";

import { useEffect, useState } from "react";
import { CampaignCreatorClient } from "@/components/campaign-creator/CampaignCreatorClient";
import { GoogleCampaignCreatorClient } from "@/components/campaign-creator/GoogleCampaignCreatorClient";
import { GoogleSearchCampaignDraftSchema } from "@/lib/google-campaign-draft";
import type { CreatorNode } from "@/lib/campaign-draft";

export function CampaignDraftLoader({ draftId, initialActiveNode }: { draftId: string; initialActiveNode?: CreatorNode }) {
  const [state, setState] = useState<{ loading: boolean; payload?: unknown; error?: string }>({ loading: true });
  useEffect(() => { fetch(`/api/campaign-templates/${encodeURIComponent(draftId)}`).then((r) => r.json()).then((json) => setState(json.ok ? { loading: false, payload: json.template.payload } : { loading: false, error: json.error })).catch(() => setState({ loading: false, error: "Falha ao carregar rascunho" })); }, [draftId]);
  if (state.loading) return <div className="p-6 text-sm text-[var(--text-dim)]">Carregando rascunho…</div>;
  if (state.error) return <div className="ui-alert-danger m-6">{state.error}</div>;
  const google = GoogleSearchCampaignDraftSchema.safeParse(state.payload);
  if (google.success) return <GoogleCampaignCreatorClient initialDraftId={draftId} initialDraft={google.data} />;
  return <CampaignCreatorClient initialDraftId={draftId} initialActiveNode={initialActiveNode} variant="uxpilot" />;
}
