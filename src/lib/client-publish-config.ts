import "server-only";

import type { Client } from "@/db/entities/Client";
import { getClientBySlugOrId } from "@/lib/app-context";

export type MetaPublishConfig = {
  metaPageId: string;
  metaLinkUrl: string | null;
  source: "client" | "env";
};

export function resolveMetaPublishConfig(client: Pick<Client, "metaPageId" | "metaLinkUrl">): {
  pageId: string | null;
  linkUrl: string | null;
  source: "client" | "env" | "none";
} {
  const pageId = client.metaPageId?.trim() || process.env.META_PAGE_ID?.trim() || null;
  const linkUrl = client.metaLinkUrl?.trim() || process.env.META_LINK_URL?.trim() || null;
  const fromClient = !!client.metaPageId?.trim();
  const fromEnv = !fromClient && !!process.env.META_PAGE_ID?.trim();

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
      ready: !!resolved.pageId
    }
  };
}

export function requireMetaPublishConfig(client: Pick<Client, "metaPageId" | "metaLinkUrl">): MetaPublishConfig {
  const { pageId, linkUrl, source } = resolveMetaPublishConfig(client);
  if (!pageId) {
    throw new Error("CLIENT_PUBLISH_CONFIG_REQUIRED");
  }
  return {
    metaPageId: pageId,
    metaLinkUrl: linkUrl,
    source: source === "client" ? "client" : "env"
  };
}

export class PublishConfigError extends Error {
  readonly code: "CLIENT_PUBLISH_CONFIG_REQUIRED" | "LINK_URL_REQUIRED" | "INVALID_LINK_URL";

  constructor(message: string, code: PublishConfigError["code"]) {
    super(message);
    this.name = "PublishConfigError";
    this.code = code;
  }
}

/** Resolve page + optional link for a single ad (URL required only for website destination). */
export function resolveAdPublishConfig(input: {
  client: Pick<Client, "metaPageId" | "metaLinkUrl">;
  pageId?: string | null;
  linkUrl?: string | null;
  destinationType?: string;
}): MetaPublishConfig {
  const pageId =
    input.pageId?.trim() ||
    input.client.metaPageId?.trim() ||
    process.env.META_PAGE_ID?.trim() ||
    null;

  if (!pageId) {
    throw new PublishConfigError(
      "Selecione a Página Meta (ou configure no perfil do cliente).",
      "CLIENT_PUBLISH_CONFIG_REQUIRED"
    );
  }

  const fromClient = !!(input.pageId?.trim() || input.client.metaPageId?.trim());
  const linkUrl =
    input.linkUrl?.trim() ||
    input.client.metaLinkUrl?.trim() ||
    process.env.META_LINK_URL?.trim() ||
    null;

  if (input.destinationType === "website") {
    if (!linkUrl) {
      throw new PublishConfigError(
        "Informe a URL de destino no anúncio (campo website).",
        "LINK_URL_REQUIRED"
      );
    }
    try {
      new URL(linkUrl);
    } catch {
      throw new PublishConfigError("URL de destino inválida", "INVALID_LINK_URL");
    }
  }

  return {
    metaPageId: pageId,
    metaLinkUrl: linkUrl,
    source: fromClient ? "client" : "env"
  };
}
