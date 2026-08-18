import "dotenv/config";

import { randomUUID } from "crypto";
import { DataSource } from "typeorm";

import { postgresOptionsFromUrl } from "../src/db/pg-config";

const apply = process.argv.includes("--apply");
const emails = process.argv
  .slice(2)
  .filter((arg) => arg !== "--apply")
  .map((email) => email.toLowerCase().trim());

if (emails.length === 0) throw new Error("Informe ao menos um email para corrigir");

const ds = new DataSource({
  ...postgresOptionsFromUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!),
  synchronize: false
});

await ds.initialize();
try {
  const result = await ds.transaction(async (manager) => {
    const freePlans = await manager.query(
      `SELECT id, "trialDays" FROM plans WHERE slug = 'free' AND "isActive" = true LIMIT 1`
    );
    const freePlan = freePlans[0] as { id: string; trialDays: number } | undefined;
    if (!freePlan) throw new Error("Plano free ativo não encontrado");

    const repaired: Array<Record<string, unknown>> = [];
    for (const email of emails) {
      const users = await manager.query(
        `SELECT u.id, u.email, u."tenantId", t.name AS tenant_name
         FROM users u JOIN tenants t ON t.id = u."tenantId"
         WHERE LOWER(u.email) = $1 FOR UPDATE OF u`,
        [email]
      );
      const user = users[0] as
        | { id: string; email: string; tenantId: string; tenant_name: string }
        | undefined;
      if (!user) throw new Error(`Usuário não encontrado: ${email}`);

      if (user.tenant_name !== "Tenant gmail.com") {
        repaired.push({ email, skipped: true, reason: "workspace já isolado" });
        continue;
      }

      const clientRows = await manager.query(
        `SELECT COUNT(*)::int AS count FROM clients WHERE "tenantId" = $1`,
        [user.tenantId]
      );
      if (clientRows[0].count !== 0) {
        throw new Error(`Tenant compartilhado de ${email} possui clientes; revisão manual necessária`);
      }

      const tenantId = randomUUID();
      const subscriptionId = randomUUID();
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + (freePlan.trialDays || 7));
      const workspaceName = `Workspace ${email}`;

      await manager.query(
        `INSERT INTO tenants (id, name, "brandName", "createdAt", "updatedAt")
         VALUES ($1, $2, $2, $3, $3)`,
        [tenantId, workspaceName, now]
      );
      await manager.query(
        `UPDATE users SET "tenantId" = $1, "updatedAt" = $2 WHERE id = $3`,
        [tenantId, now, user.id]
      );
      const movedMembership = await manager.query(
        `UPDATE tenant_members
         SET "tenantId" = $1, role = 'admin', "updatedAt" = $2
         WHERE "tenantId" = $3 AND "userId" = $4
         RETURNING id`,
        [tenantId, now, user.tenantId, user.id]
      );
      if (movedMembership.length === 0) {
        await manager.query(
          `INSERT INTO tenant_members
             (id, "tenantId", "userId", role, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'admin', $4, $4)`,
          [randomUUID(), tenantId, user.id, now]
        );
      }
      await manager.query(
        `UPDATE funnel_events SET "tenantId" = $1, "updatedAt" = $2
         WHERE "tenantId" = $3 AND "userId" = $4`,
        [tenantId, now, user.tenantId, user.id]
      );
      await manager.query(
        `INSERT INTO subscriptions
           (id, "tenantId", "planId", status, "billingCycle", "currentPeriodStart",
            "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'trialing', 'monthly', $4, $5, false, $4, $4)`,
        [subscriptionId, tenantId, freePlan.id, now, trialEnd]
      );

      repaired.push({ email, tenantId, plan: "free", status: "trialing", trialEnd });
    }

    if (!apply) throw Object.assign(new Error("DRY_RUN_ROLLBACK"), { repaired });
    return repaired;
  });
  console.log(JSON.stringify({ applied: true, users: result }, null, 2));
} catch (error) {
  if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
    console.log(
      JSON.stringify(
        { applied: false, users: (error as Error & { repaired: unknown }).repaired },
        null,
        2
      )
    );
  } else {
    throw error;
  }
} finally {
  await ds.destroy();
}
