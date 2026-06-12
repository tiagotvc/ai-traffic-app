import "server-only";

import { auth } from "@/auth";
import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import { isDemoClient, isSystemDefaultClient } from "@/lib/demo-data";
import {
  getTenantMetaAccessToken,
  isMetaPermissionError,
  persistMetaAuth,
  resolveWorkspaceMetaAccessToken
} from "@/lib/meta-auth-store";
import { resolveTenantName } from "@/lib/tenant-name";
import { isUuid } from "@/lib/uuid";
import {
  acceptPendingInviteForEmail,
  ensureTenantMember,
  getUserWorkspaceMembership
} from "@/lib/workspace-members";
import { IsNull, MoreThan } from "typeorm";
import { ensureFreeSubscription } from "@/lib/billing/event-handlers";
import { assertTenantCanLogin, getEntitlements } from "@/lib/billing/entitlements";
import { isPlatformAdmin } from "@/lib/platform-auth";
import type { Entitlements } from "@/lib/billing/types";

export async function getAppContext() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  const ds = await getDataSource();
  const {
    tenant: tenantRepo,
    user: userRepo,
    client: clientRepo,
    tenantInvite: inviteRepo,
    tenantMember: memberRepo
  } = await repositories();

  const email = session.user.email.toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaProfileId = (session as any).meta?.profileId as string | undefined;

  let user = await userRepo.findOne({ where: { email } });
  let tenant;

  const existingMembership = user ? await getUserWorkspaceMembership(user.id) : null;

  if (existingMembership) {
    tenant = await tenantRepo.findOne({ where: { id: existingMembership.tenantId } });
    if (!tenant) {
      await memberRepo.delete({ userId: user!.id });
    } else if (user && user.tenantId !== tenant.id) {
      user.tenantId = tenant.id;
      await userRepo.save(user);
    }
  }

  if (!tenant) {
    const pendingInvite = await inviteRepo.findOne({
      where: { email, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: "DESC" }
    });

    if (pendingInvite) {
      if (!user) {
        user = userRepo.create({
          email,
          name: session.user.name ?? null,
          tenantId: pendingInvite.tenantId
        });
        await userRepo.save(user);
      }
      await acceptPendingInviteForEmail(user, email);
      user = (await userRepo.findOne({ where: { email } }))!;
      tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
    } else {
      const tenantName = resolveTenantName(email, metaProfileId);
      let metaTenant = await tenantRepo.findOne({ where: { name: tenantName } });
      if (!metaTenant) {
        metaTenant = tenantRepo.create({ name: tenantName, brandName: tenantName });
        await tenantRepo.save(metaTenant);
      }

      if (!user) {
        user = userRepo.create({
          email,
          name: session.user.name ?? null,
          tenantId: metaTenant.id
        });
        await userRepo.save(user);
      } else if (user.tenantId !== metaTenant.id) {
        user.tenantId = metaTenant.id;
        await userRepo.save(user);
      }
      tenant = metaTenant;
    }
  }

  if (!user) {
    user = (await userRepo.findOne({ where: { email } }))!;
  }

  if (!tenant) {
    tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
  }
  if (!tenant) {
    const tenantName = resolveTenantName(email, metaProfileId);
    tenant = tenantRepo.create({ name: tenantName, brandName: tenantName });
    await tenantRepo.save(tenant);
    user.tenantId = tenant.id;
    await userRepo.save(user);
  }

  await ensureTenantMember(tenant.id, user.id);

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

  let metaAccessToken = await resolveWorkspaceMetaAccessToken(tenant.id, user.id, sessionToken);

  await ensureFreeSubscription(tenant.id);

  const platformAdmin = await isPlatformAdmin(user.id);
  if (!platformAdmin) {
    await assertTenantCanLogin(tenant.id);
  }

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
