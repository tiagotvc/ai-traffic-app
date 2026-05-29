import "server-only";

import { auth } from "@/auth";
import { getDataSource } from "@/db/data-source";
import { repositories } from "@/db/repositories";
import type { Client } from "@/db/entities/Client";
import type { Repository } from "typeorm";
import { getStoredMetaAccessToken, persistMetaAuth } from "@/lib/meta-auth-store";
import { isUuid } from "@/lib/uuid";

export async function getAppContext() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  const ds = await getDataSource();
  const { tenant: tenantRepo, user: userRepo, client: clientRepo } = await repositories();

  const email = session.user.email.toLowerCase();

  const domain = email.split("@")[1] ?? "local";
  const tenantName = domain === "local" ? "Tenant Local" : `Tenant ${domain}`;

  let tenant = await tenantRepo.findOne({ where: { name: tenantName } });
  if (!tenant) {
    tenant = tenantRepo.create({ name: tenantName, brandName: tenantName });
    await tenantRepo.save(tenant);
  }

  let user = await userRepo.findOne({ where: { email } });
  if (!user) {
    user = userRepo.create({
      email,
      name: session.user.name ?? null,
      tenantId: tenant.id
    });
    await userRepo.save(user);
  } else if (user.tenantId !== tenant.id) {
    user.tenantId = tenant.id;
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

  await ensureDemoClients(tenant.id, clientRepo);

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

  let metaAccessToken = meta?.accessToken;
  if (!metaAccessToken) {
    metaAccessToken = await getStoredMetaAccessToken(user.id);
  } else {
    await persistMetaAuth(user.id, {
      access_token: metaAccessToken,
      token_type: meta?.tokenType ?? null,
      scope: meta?.scopes ?? null,
      expires_at: meta?.expiresAt ?? null
    });
  }

  return { session, ds, tenant, user, defaultClient, metaAccessToken };
}

export async function listClientsForTenant(tenantId: string) {
  const { client } = await repositories();
  return client.find({ where: { tenantId }, order: { name: "ASC" } });
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

async function ensureDemoClients(tenantId: string, clientRepo: Repository<Client>) {
  const demoNames = ["Odonto Plus", "Loja Fitness", "Clínica Bella"];
  for (const name of demoNames) {
    const exists = await clientRepo.findOne({ where: { tenantId, name } });
    if (!exists) {
      await clientRepo.save(
        clientRepo.create({
          tenantId,
          name,
          aiContext:
            name === "Odonto Plus"
              ? {
                  niche: "Odontologia",
                  audience: "Mulheres 30-50",
                  cpaGoal: 45,
                  objective: "Leads"
                }
              : { note: `Cliente demo ${name}` }
        })
      );
    }
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
