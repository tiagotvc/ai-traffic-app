import type { MigrationInterface, QueryRunner } from "typeorm";

export class BillingModule1735691100000 implements MigrationInterface {
  name = "BillingModule1735691100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        "priceMonthlyCents" int NOT NULL DEFAULT 0,
        "priceYearlyCents" int NOT NULL DEFAULT 0,
        limits jsonb NOT NULL DEFAULT '{}',
        "externalPrices" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" int NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL UNIQUE,
        "planId" uuid NOT NULL REFERENCES plans(id),
        status text NOT NULL DEFAULT 'active',
        "paymentProvider" text,
        "billingCycle" text NOT NULL DEFAULT 'monthly',
        "externalCustomerId" text,
        "externalSubscriptionId" text,
        "currentPeriodStart" timestamptz,
        "currentPeriodEnd" timestamptz,
        "gracePeriodEndsAt" timestamptz,
        "canceledAt" timestamptz,
        "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions("planId");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL UNIQUE,
        name text NOT NULL,
        email text NOT NULL,
        "cpfCnpj" text,
        phone text,
        "postalCode" text,
        address text,
        "addressNumber" text,
        city text,
        state text,
        "asaasCustomerId" text,
        "stripeCustomerId" text,
        "preferredProvider" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "subscriptionId" uuid REFERENCES subscriptions(id),
        provider text NOT NULL,
        "externalPaymentId" text,
        "amountCents" int NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        "billingType" text,
        "dueDate" date,
        "paidAt" timestamptz,
        "invoiceUrl" text,
        "pixQrCode" text,
        "pixCopyPaste" text,
        "pixExpiresAt" timestamptz,
        "nfStatus" text NOT NULL DEFAULT 'not_applicable',
        "nfNumber" text,
        "nfPdfUrl" text,
        "nfIssuedAt" timestamptz,
        "asaasInvoiceId" text,
        description text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices("tenantId");`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_external ON invoices(provider, "externalPaymentId") WHERE "externalPaymentId" IS NOT NULL;`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid,
        provider text NOT NULL,
        "eventType" text NOT NULL,
        "idempotencyKey" text NOT NULL UNIQUE,
        payload jsonb,
        "processedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_billing_events_tenant ON billing_events("tenantId");`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS billing_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}',
        status text NOT NULL DEFAULT 'pending',
        attempts int NOT NULL DEFAULT 0,
        "runAfter" timestamptz NOT NULL DEFAULT now(),
        "lastError" text,
        "processedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_billing_jobs_pending ON billing_jobs(status, "runAfter") WHERE status = 'pending';`
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refund_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenantId" uuid NOT NULL,
        "invoiceId" uuid NOT NULL REFERENCES invoices(id),
        "requestedByUserId" uuid NOT NULL,
        provider text NOT NULL,
        reason text,
        status text NOT NULL DEFAULT 'pending',
        "externalRefundId" text,
        "reviewedByUserId" uuid,
        "reviewedAt" timestamptz,
        "reviewNote" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);`
    );

    const freeLimits = JSON.stringify({
      maxClients: 1,
      maxAdAccounts: 2,
      maxMembers: 1,
      maxAutomationRules: 0,
      maxAiRequestsPerMonth: 0,
      maxScheduledReports: 0,
      allowAutoSync: false,
      allowLiveMeta: false
    });
    const proLimits = JSON.stringify({
      maxClients: 15,
      maxAdAccounts: 50,
      maxMembers: 5,
      maxAutomationRules: 10,
      maxAiRequestsPerMonth: 100,
      maxScheduledReports: 5,
      allowAutoSync: true,
      allowLiveMeta: true
    });

    await queryRunner.query(`
      INSERT INTO plans (slug, name, description, "priceMonthlyCents", "priceYearlyCents", limits, "sortOrder")
      VALUES
        ('free', 'Free', 'Plano gratuito para começar', 0, 0, '${freeLimits}'::jsonb, 0),
        ('pro', 'Pro', 'Para agências e gestores de tráfego', 9900, 99000, '${proLimits}'::jsonb, 1)
      ON CONFLICT (slug) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refund_requests;`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_jobs;`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_events;`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoices;`);
    await queryRunner.query(`DROP TABLE IF EXISTS billing_customers;`);
    await queryRunner.query(`DROP TABLE IF EXISTS subscriptions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS plans;`);
  }
}
