import "server-only";

import { In, Like } from "typeorm";

import type { Client } from "@/db/entities/Client";
import { repositories } from "@/db/repositories";

/** Clientes criados automaticamente no MVP — não são contas reais da agência. */
export const DEMO_CLIENT_NAMES = ["Odonto Plus", "Loja Fitness", "Clínica Bella"] as const;

const DEMO_CLIENT_NAME_SET = new Set<string>(DEMO_CLIENT_NAMES);

export function isDemoClient(client: Pick<Client, "name" | "aiContext">): boolean {
  if (DEMO_CLIENT_NAME_SET.has(client.name)) return true;
  const ctx = client.aiContext as { note?: string } | null | undefined;
  const note = typeof ctx?.note === "string" ? ctx.note.toLowerCase() : "";
  return note.includes("cliente demo");
}

/**
 * Cliente "Default" criado automaticamente no onboarding (scaffolding do MVP).
 * Não é um cliente real cadastrado pelo usuário; deve ser ocultado das listas
 * quando já existem clientes reais.
 */
export function isSystemDefaultClient(client: Pick<Client, "name" | "aiContext">): boolean {
  if (client.name !== "Default") return false;
  const ctx = client.aiContext as { note?: string } | null | undefined;
  const note = typeof ctx?.note === "string" ? ctx.note.toLowerCase() : "";
  return note.includes("criado automaticamente");
}

export function isDemoAdAccountId(metaAdAccountId: string): boolean {
  const id = metaAdAccountId.toLowerCase();
  return id === "act_demo" || id.includes("demo");
}

/**
 * Workspace de demonstração: TODAS as contas de anúncio são fictícias (`act_demo_*`).
 *
 * Um workspace assim nunca vai ter token da Meta, porque não existe conta real para
 * conectar. Sem isso as telas ficariam presas no aviso de "conecte a Meta" mesmo com
 * o banco cheio de dados. A exigência de que *todas* sejam demo é proposital: um
 * cliente real que tenha uma conta de teste sobrando continua vendo o aviso, que para
 * ele é a informação correta.
 */
export async function isDemoWorkspace(tenantId: string): Promise<boolean> {
  const { client: clientRepo, adAccount: adAccountRepo } = await repositories();

  const clients = await clientRepo.find({ where: { tenantId }, select: { id: true } });
  if (!clients.length) return false;

  const accounts = await adAccountRepo.find({
    where: clients.map((c) => ({ clientId: c.id })),
    select: { metaAdAccountId: true }
  });
  if (!accounts.length) return false;

  return accounts.every((a) => isDemoAdAccountId(a.metaAdAccountId));
}

export async function purgeDemoDataForTenant(tenantId: string) {
  const {
    client: clientRepo,
    adAccount: adAccountRepo,
    metaAdAccountInventory: invRepo
  } = await repositories();

  const clients = await clientRepo.find({ where: { tenantId } });
  const demoClients = clients.filter((c) => c.name !== "Default" && isDemoClient(c));

  let removedClients = 0;
  for (const c of demoClients) {
    await clientRepo.remove(c);
    removedClients += 1;
  }

  const tenantClientIds = clients.map((c) => c.id);
  const allAccounts = tenantClientIds.length
    ? await adAccountRepo.find({ where: { clientId: In(tenantClientIds) } })
    : [];
  const demoAccounts = allAccounts.filter((a) => isDemoAdAccountId(a.metaAdAccountId));
  if (demoAccounts.length) {
    await adAccountRepo.remove(demoAccounts);
  }

  const invDemo = await invRepo.find({
    where: { tenantId, isDemo: true }
  });
  if (invDemo.length) {
    await invRepo.remove(invDemo);
  }

  const invById = await invRepo.find({
    where: { tenantId, metaAdAccountId: Like("%demo%") }
  });
  const extraInv = invById.filter((r) => !invDemo.some((d) => d.id === r.id));
  if (extraInv.length) {
    await invRepo.remove(extraInv);
  }

  return {
    removedClients,
    removedAdAccounts: demoAccounts.length,
    removedInventory: invDemo.length + extraInv.length
  };
}
