import "server-only";

import { repositories } from "@/db/repositories";
import { formatMetaAdAccountLabel } from "@/lib/meta-account-label";
import {
  fetchAllAccessibleAdAccounts,
  fetchBusinessPages,
  fetchMyAdAccounts,
  fetchMyBusinesses,
  fetchUserPages
} from "@/lib/meta-graph";

const DEMO_ACCOUNT_ID = "act_demo";

export type MetaDiscoverResult = {
  businesses: number;
  adAccounts: number;
  pages: number;
  businessRows: Array<{
    metaBusinessId: string;
    name: string;
    adAccountCount: number;
    pageCount: number;
  }>;
};

async function upsertAdAccountInventory(
  tenantId: string,
  acc: { id: string; name?: string; account_status?: number },
  metaBusinessId: string | null,
  inventoryRepo: Awaited<ReturnType<typeof repositories>>["metaAdAccountInventory"]
) {
  const isDemo = acc.id === DEMO_ACCOUNT_ID || acc.id === `act_${DEMO_ACCOUNT_ID}` || acc.id.includes("demo");
  let inv = await inventoryRepo.findOne({
    where: { tenantId, metaAdAccountId: acc.id }
  });
  if (!inv) {
    inv = inventoryRepo.create({
      tenantId,
      metaAdAccountId: acc.id,
      metaBusinessId,
      label: formatMetaAdAccountLabel(acc),
      isDemo
    });
  } else {
    if (metaBusinessId) inv.metaBusinessId = metaBusinessId;
    inv.label = formatMetaAdAccountLabel(acc);
    inv.isDemo = isDemo;
  }
  await inventoryRepo.save(inv);
}

export async function runMetaDiscover(
  tenantId: string,
  metaAccessToken: string
): Promise<MetaDiscoverResult> {
  const {
    metaBusiness: businessRepo,
    metaPage: pageRepo,
    metaAdAccountInventory: inventoryRepo
  } = await repositories();

  const now = new Date();
  const businesses = await fetchMyBusinesses(metaAccessToken);
  const accountKeys = new Set<string>();
  const pageKeys = new Set<string>();

  // BMs inferidos a partir das contas (acc.business) — cobrem BMs que /me/businesses não retorna.
  const bmFromAccounts = new Map<string, string>();

  // 1) RÁPIDO: /me/adaccounts já traz o BM dono (business) numa única chamada.
  //    Grava o inventário primeiro para que o vínculo conta→BM fique salvo mesmo
  //    se os loops mais pesados (abaixo) demorarem ou estourarem o timeout.
  for (const acc of await fetchMyAdAccounts(metaAccessToken)) {
    accountKeys.add(acc.id);
    await upsertAdAccountInventory(tenantId, acc, acc.business?.id ?? null, inventoryRepo);
    if (acc.business?.id) {
      bmFromAccounts.set(acc.business.id, acc.business.name ?? acc.business.id);
    }
  }

  // 2) ENRIQUECIMENTO (mais lento): contas acessíveis via BM/business_users que
  //    não vieram em /me/adaccounts. Pula as já gravadas acima.
  const accessibleAccounts = await fetchAllAccessibleAdAccounts(metaAccessToken);
  for (const [id, acc] of accessibleAccounts) {
    if (accountKeys.has(id)) continue;
    accountKeys.add(id);
    await upsertAdAccountInventory(tenantId, acc, acc.metaBusinessId, inventoryRepo);
    if (acc.metaBusinessId) {
      bmFromAccounts.set(acc.metaBusinessId, acc.metaBusinessName ?? acc.metaBusinessId);
    }
  }

  // Garante uma linha MetaBusiness para cada BM dono de conta (mesmo fora de /me/businesses).
  const businessesFromApi = new Set(businesses.map((b) => b.id));
  for (const [bmId, bmName] of bmFromAccounts) {
    if (businessesFromApi.has(bmId)) continue;
    let row = await businessRepo.findOne({ where: { tenantId, metaBusinessId: bmId } });
    if (!row) {
      row = businessRepo.create({ tenantId, metaBusinessId: bmId, name: bmName });
    } else {
      row.name = bmName || row.name;
    }
    row.lastSyncedAt = now;
    await businessRepo.save(row);
  }

  if (businesses.length) {
    for (const bm of businesses) {
      let row = await businessRepo.findOne({
        where: { tenantId, metaBusinessId: bm.id }
      });
      if (!row) {
        row = businessRepo.create({
          tenantId,
          metaBusinessId: bm.id,
          name: bm.name ?? bm.id
        });
      } else {
        row.name = bm.name ?? row.name;
      }
      row.lastSyncedAt = now;
      await businessRepo.save(row);

      const pages = await fetchBusinessPages(metaAccessToken, bm.id);
      for (const pg of pages) {
        pageKeys.add(pg.id);
        let pageRow = await pageRepo.findOne({
          where: { tenantId, metaPageId: pg.id }
        });
        if (!pageRow) {
          pageRow = pageRepo.create({
            tenantId,
            metaPageId: pg.id,
            metaBusinessId: bm.id,
            name: pg.name ?? pg.id
          });
        } else {
          pageRow.metaBusinessId = bm.id;
          pageRow.name = pg.name ?? pageRow.name;
        }
        await pageRepo.save(pageRow);
      }
    }
  }

  const flatPages = await fetchUserPages(metaAccessToken);
  for (const pg of flatPages) {
    if (pageKeys.has(pg.id)) continue;
    pageKeys.add(pg.id);
    let row = await pageRepo.findOne({
      where: { tenantId, metaPageId: pg.id }
    });
    if (!row) {
      row = pageRepo.create({
        tenantId,
        metaPageId: pg.id,
        metaBusinessId: null,
        name: pg.name ?? pg.id
      });
    } else {
      row.name = pg.name ?? row.name;
    }
    await pageRepo.save(row);
  }

  const businessRows: MetaDiscoverResult["businessRows"] = [];
  const inv = await inventoryRepo.find({ where: { tenantId } });
  const pages = await pageRepo.find({ where: { tenantId } });
  // Lê todos os BMs persistidos (de /me/businesses + os inferidos das contas).
  const allBusinesses = await businessRepo.find({ where: { tenantId } });

  for (const bm of allBusinesses) {
    businessRows.push({
      metaBusinessId: bm.metaBusinessId,
      name: bm.name,
      adAccountCount: inv.filter((a) => a.metaBusinessId === bm.metaBusinessId).length,
      pageCount: pages.filter((p) => p.metaBusinessId === bm.metaBusinessId).length
    });
  }

  const unassignedAccounts = inv.filter((a) => !a.metaBusinessId).length;
  const unassignedPages = pages.filter((p) => !p.metaBusinessId).length;
  if (unassignedAccounts > 0 || unassignedPages > 0) {
    businessRows.push({
      metaBusinessId: "unassigned",
      name: "Sem BM (acesso direto)",
      adAccountCount: unassignedAccounts,
      pageCount: unassignedPages
    });
  }

  if (!businesses.length && (unassignedAccounts > 0 || unassignedPages > 0)) {
    // já coberto por unassigned row acima
  }

  const realBusinessCount = businessRows.filter((r) => r.metaBusinessId !== "unassigned").length;

  return {
    businesses: realBusinessCount,
    adAccounts: accountKeys.size,
    pages: pageKeys.size || pages.length,
    businessRows
  };
}

export async function listTenantBusinessesWithCounts(tenantId: string) {
  const {
    metaBusiness: businessRepo,
    metaPage: pageRepo,
    metaAdAccountInventory: inventoryRepo
  } = await repositories();

  const businesses = await businessRepo.find({
    where: { tenantId },
    order: { name: "ASC" }
  });

  const inv = await inventoryRepo.find({ where: { tenantId } });
  const pages = await pageRepo.find({ where: { tenantId } });

  const rows = businesses.map((b) => ({
    metaBusinessId: b.metaBusinessId,
    name: b.name,
    lastSyncedAt: b.lastSyncedAt?.toISOString() ?? null,
    adAccountCount: inv.filter((a) => a.metaBusinessId === b.metaBusinessId).length,
    pageCount: pages.filter((p) => p.metaBusinessId === b.metaBusinessId).length
  }));

  const unassignedAccounts = inv.filter((a) => !a.metaBusinessId).length;
  const unassignedPages = pages.filter((p) => !p.metaBusinessId).length;
  if (unassignedAccounts > 0 || unassignedPages > 0) {
    rows.push({
      metaBusinessId: "unassigned",
      name: "Sem BM (acesso direto)",
      lastSyncedAt: null,
      adAccountCount: unassignedAccounts,
      pageCount: unassignedPages
    });
  }

  return rows;
}

export async function listTenantPages(tenantId: string, metaBusinessId?: string | null) {
  const { metaPage: pageRepo } = await repositories();
  const pages = await pageRepo.find({ where: { tenantId }, order: { name: "ASC" } });
  if (metaBusinessId === "unassigned") {
    return pages.filter((p) => !p.metaBusinessId);
  }
  if (metaBusinessId) {
    return pages.filter((p) => p.metaBusinessId === metaBusinessId);
  }
  return pages;
}

export async function listTenantInventory(
  tenantId: string,
  metaBusinessId?: string | null
) {
  const { metaAdAccountInventory: inventoryRepo, metaBusiness: businessRepo } =
    await repositories();
  const inv = await inventoryRepo.find({ where: { tenantId }, order: { label: "ASC" } });
  const businesses = await businessRepo.find({ where: { tenantId } });
  const bmName = new Map(businesses.map((b) => [b.metaBusinessId, b.name]));

  let filtered = inv;
  if (metaBusinessId === "unassigned") {
    filtered = inv.filter((a) => !a.metaBusinessId);
  } else if (metaBusinessId) {
    filtered = inv.filter((a) => a.metaBusinessId === metaBusinessId);
  }

  return filtered.map((a) => ({
    metaAdAccountId: a.metaAdAccountId,
    label: a.label ?? a.metaAdAccountId,
    metaBusinessId: a.metaBusinessId,
    metaBusinessName: a.metaBusinessId ? bmName.get(a.metaBusinessId) ?? null : null,
    isDemo: a.isDemo
  }));
}

export async function getBusinessNameMap(tenantId: string) {
  const { metaBusiness: businessRepo } = await repositories();
  const rows = await businessRepo.find({ where: { tenantId } });
  return new Map(rows.map((b) => [b.metaBusinessId, b.name]));
}
