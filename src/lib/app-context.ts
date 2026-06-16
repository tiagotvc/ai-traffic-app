import "server-only";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import {
  persistMetaAuth,
  resolveWorkspaceMetaAccessToken
} from "@/lib/meta-auth-store";
import { isUuid } from "@/lib/uuid";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getAppShellContext } from "@/lib/app-shell-context";
import type { Entitlements } from "@/lib/billing/types";

export async function getAppContext() {
  const shell = await getAppShellContext();
  const { session, tenant, user, platformAdmin } = shell;

  const ds = await getDataSource();
  const { user: userRepo, client: clientRepo } = await repositories();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facebookId = (session as any).meta?.profileId as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleId = (session as any).googleId as string | undefined;

  if (user && googleId && user.googleId !== googleId) {
    user.googleId = googleId;
    await userRepo.save(user);
  }
  if (user && facebookId && user.facebookId !== facebookId) {
    user.facebookId = facebookId;
    await userRepo.save(user);
  }

  let defaultClient = await clientRepo.findOne({
    where: { tenantId: tenant.id, name: "Default" }
  });
  if (!defaultClient) {
    defaultClient = clientRepo.create({
      tenantId: tenant.id,
      name: "Default",
      aiContext: {
        note: "Cliente padrão criado automaticamente no MVP."
      }
    });
    await clientRepo.save(defaultClient);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = (session as any).meta as
    | {
        accessToken?: string;
        expiresAt?: number;
        tokenType?: string;
        scopes?: string;
        profileId?: string;
      }
    | undefined;

  const sessionToken = meta?.accessToken;
  if (sessionToken) {
    await persistMetaAuth(user.id, {
      access_token: sessionToken,
      token_type: meta?.tokenType ?? null,
      scope: meta?.scopes ?? null,
      expires_at: meta?.expiresAt ?? null
    });
  }

  const metaAccessToken = await resolveWorkspaceMetaAccessToken(tenant.id, user.id, sessionToken);

  await ensureFreeSubscription(tenant.id);

  const entitlements: Entitlements = await getEntitlements(tenant.id);

  return { session, ds, tenant, user, defaultClient, metaAccessToken, entitlements, platformAdmin };
}

export async function listClientsForTenant(tenantId: string, opts?: { includeDemo?: boolean }) {
  const { client } = await repositories();
  const rows = await client.find({ where: { tenantId }, order: { name: "ASC" } });
  if (opts?.includeDemo) return rows;
  const real = rows.filter((c) => !isDemoClient(c));
  // Oculta o cliente "Default" (scaffolding) quando já há clientes reais.
  const nonDefault = real.filter((c) => !isSystemDefaultClient(c));
  return nonDefault.length > 0 ? nonDefault : real;
}

export async function getClientBySlugOrId(tenantId: string, clientIdOrSlug: string) {
  const { client: repo } = await repositories();
  const decoded = decodeURIComponent(clientIdOrSlug);

  if (isUuid(decoded)) {
    const byId = await repo.findOne({ where: { id: decoded, tenantId } });
    if (byId) return byId;
  }

  const all = await repo.find({ where: { tenantId } });
  return (
    all.find((c) => slugify(c.name) === decoded) ??
    all.find((c) => slugify(c.name) === clientIdOrSlug) ??
    null
  );
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
