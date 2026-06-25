import "server-only";

import { In } from "typeorm";

import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import {
  resolveMetaAccessTokenForAdAccount,
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

  // Token Meta de ads fica em meta_auth (fluxo "Reconectar Meta"). Não sobrescrever
  // com access_token legado do JWT — isso invalidava reconexões bem-sucedidas.
  const metaAccessToken = await resolveWorkspaceMetaAccessToken(tenant.id, user.id);

  await ensureFreeSubscription(tenant.id);

  const entitlements: Entitlements = await getEntitlements(tenant.id, { platformAdmin });

  return { session, ds, tenant, user, defaultClient, metaAccessToken, entitlements, platformAdmin };
}

/** Token Meta com acesso confirmado à conta de anúncios (fallback entre tokens do workspace). */
export async function getMetaAccessTokenForAdAccount(
  tenantId: string,
  userId: string,
  adAccountId: string
): Promise<string | undefined> {
  return resolveMetaAccessTokenForAdAccount(tenantId, userId, adAccountId);
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
  const { client: repo, adAccount: adAccountRepo } = await repositories();
  const decoded = decodeURIComponent(clientIdOrSlug);

  if (isUuid(decoded)) {
    const byId = await repo.findOne({ where: { id: decoded, tenantId } });
    if (byId) return byId;
  }

  const all = await repo.find({ where: { tenantId } });
  const slugMatches = all.filter(
    (c) => slugify(c.name) === decoded || slugify(c.name) === clientIdOrSlug
  );
  if (slugMatches.length === 1) return slugMatches[0];
  if (slugMatches.length > 1) {
    const linked = await adAccountRepo.find({
      where: { clientId: In(slugMatches.map((c) => c.id)) }
    });
    const withAccounts = new Set(linked.map((a) => a.clientId));
    return (
      slugMatches.find((c) => withAccounts.has(c.id)) ??
      slugMatches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
    );
  }

  return null;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
