import { Column, Entity } from "typeorm";
import { AppBaseEntity, jsonColumn } from "./_shared";

/** Status that AppSumo reports for the license on their side (`license_status` in the webhook payload). */
export type AppsumoLicenseStatus = "inactive" | "active" | "deactivated";

/**
 * One row per AppSumo `license_key`. Created by the `purchase` webhook (before any tenant
 * exists), linked to a tenant once the buyer completes the OAuth activation flow.
 *
 * On upgrade/downgrade AppSumo issues a brand new `license_key` and deactivates the old one —
 * `linkAppsumoLicenseToTenant` detaches the superseded row's `tenantId` itself instead of
 * waiting for the simultaneous `deactivate` webhook, so a race between the two events can never
 * suspend the tenant that just upgraded.
 */
@Entity({ name: "appsumo_licenses" })
export class AppsumoLicense extends AppBaseEntity {
  @Column({ type: "text", unique: true })
  licenseKey!: string;

  /** Previous key this license superseded (set on upgrade/downgrade). Audit trail only. */
  @Column({ type: "text", nullable: true })
  prevLicenseKey?: string | null;

  /** Null until the buyer completes OAuth activation and we know which tenant to grant access to. */
  @Column({ type: "uuid", nullable: true })
  tenantId?: string | null;

  /** AppSumo license tier (1, 2, 3, ...) — maps to a plan slug via APPSUMO_TIER_PLAN_SLUG. */
  @Column({ type: "int", nullable: true })
  tier?: number | null;

  @Column({ type: "text", default: "inactive" })
  licenseStatus!: AppsumoLicenseStatus;

  /** Add-on fields — stored for support lookups, not yet wired to entitlements (no add-ons sold today). */
  @Column({ type: "text", nullable: true })
  partnerPlanName?: string | null;

  @Column({ type: "text", nullable: true })
  parentLicenseKey?: string | null;

  @Column({ type: "int", nullable: true })
  unitQuantity?: number | null;

  @Column({ type: "text", nullable: true })
  lastEvent?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  lastEventAt?: Date | null;

  @jsonColumn()
  rawPayload?: Record<string, unknown> | null;
}
