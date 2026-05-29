import "server-only";

import type { Client } from "@/db/entities/Client";
import { getClientBySlugOrId } from "@/lib/app-context";

export type MetaPublishConfig = {
  metaPageId: string;
  metaLinkUrl: string;
  source: "client" | "env";
};

export function resolveMetaPublishConfig(client: Pick<Client, "metaPageId" | "metaLinkUrl">): {
  pageId: string | null;
  linkUrl: string | null;
  source: "client" | "env" | "none";
} {
  const pageId = client.metaPageId?.trim() || process.env.META_PAGE_ID?.trim() || null;
  const linkUrl = client.metaLinkUrl?.trim() || process.env.META_LINK_URL?.trim() || null;
  const fromClient = !!(client.metaPageId?.trim() && client.metaLinkUrl?.trim());
  const fromEnv = !fromClient && !!(process.env.META_PAGE_ID?.trim() && process.env.META_LINK_URL?.trim());

  return {
    pageId,
    linkUrl,
    source: fromClient ? "client" : fromEnv ? "env" : "none"
  };
}

export async function getMetaPublishConfigForClient(tenantId: string, clientIdOrSlug: string) {
  const client = await getClientBySlugOrId(tenantId, clientIdOrSlug);
  if (!client) return null;

  const resolved = resolveMetaPublishConfig(client);
  return {
    client: {
      id: client.id,
      name: client.name,
      metaPageId: client.metaPageId ?? null,
      metaLinkUrl: client.metaLinkUrl ?? null
    },
    resolved: {
      pageId: resolved.pageId,
      linkUrl: resolved.linkUrl,
      source: resolved.source,
      ready: !!(resolved.pageId && resolved.linkUrl)
    }
  };
}

export function requireMetaPublishConfig(client: Pick<Client, "metaPageId" | "metaLinkUrl">): MetaPublishConfig {
  const { pageId, linkUrl, source } = resolveMetaPublishConfig(client);
  if (!pageId || !linkUrl) {
    throw new Error("CLIENT_PUBLISH_CONFIG_REQUIRED");
  }
  return {
    metaPageId: pageId,
    metaLinkUrl: linkUrl,
    source: source === "client" ? "client" : "env"
  };
}
