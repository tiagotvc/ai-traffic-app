import { getDataSource } from "@/db/data-source";
import type { AdAccount } from "@/db/entities/AdAccount";
import type { AiRecommendation } from "@/db/entities/AiRecommendation";
import type { Alert } from "@/db/entities/Alert";
import type { AuditLog } from "@/db/entities/AuditLog";
import type { AutomationRule } from "@/db/entities/AutomationRule";
import type { CampaignGoal } from "@/db/entities/CampaignGoal";
import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { CampaignPreset } from "@/db/entities/CampaignPreset";
import type { CampaignTemplate } from "@/db/entities/CampaignTemplate";
import type { Client } from "@/db/entities/Client";
import type { ClientGoal } from "@/db/entities/ClientGoal";
import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { ClientTag } from "@/db/entities/ClientTag";
import type { CreativeAsset } from "@/db/entities/CreativeAsset";
import type { LookalikeJob } from "@/db/entities/LookalikeJob";
import type { MetaAdAccountInventory } from "@/db/entities/MetaAdAccountInventory";
import type { MetaAuth } from "@/db/entities/MetaAuth";
import type { MetaAudienceCache } from "@/db/entities/MetaAudienceCache";
import type { MetaBusiness } from "@/db/entities/MetaBusiness";
import type { MetaPage } from "@/db/entities/MetaPage";
import type { MetricSnapshot } from "@/db/entities/MetricSnapshot";
import type { NotificationState } from "@/db/entities/NotificationState";
import type { RankingConfig } from "@/db/entities/RankingConfig";
import type { ReportSchedule } from "@/db/entities/ReportSchedule";
import type { SavedView } from "@/db/entities/SavedView";
import type { SyncQueueJob } from "@/db/entities/SyncQueueJob";
import type { SyncRun } from "@/db/entities/SyncRun";
import type { Tenant } from "@/db/entities/Tenant";
import type { TenantSyncState } from "@/db/entities/TenantSyncState";
import type { User } from "@/db/entities/User";
import type { UserClient } from "@/db/entities/UserClient";
import type { TenantMember } from "@/db/entities/TenantMember";
import type { TenantInvite } from "@/db/entities/TenantInvite";
import type { Plan } from "@/db/entities/Plan";
import type { Subscription } from "@/db/entities/Subscription";
import type { BillingCustomer } from "@/db/entities/BillingCustomer";
import type { Invoice } from "@/db/entities/Invoice";
import type { BillingEvent } from "@/db/entities/BillingEvent";
import type { BillingJob } from "@/db/entities/BillingJob";
import type { RefundRequest } from "@/db/entities/RefundRequest";
import type { DiscountCoupon } from "@/db/entities/DiscountCoupon";
import type { CouponRedemption } from "@/db/entities/CouponRedemption";
import type { ClientLearning } from "@/db/entities/ClientLearning";
import type { DataSource, EntityTarget, ObjectLiteral, Repository } from "typeorm";
import { EntityMetadataNotFoundError } from "typeorm";

/** Stable TypeORM entity names — must match stabilizeTypeOrmEntityNames in registry. */
const ENTITY = {
  Tenant: "Tenant",
  User: "User",
  Client: "Client",
  AdAccount: "AdAccount",
  MetaAuth: "MetaAuth",
  MetaBusiness: "MetaBusiness",
  MetaPage: "MetaPage",
  MetaAdAccountInventory: "MetaAdAccountInventory",
  MetricSnapshot: "MetricSnapshot",
  CampaignMetricSnapshot: "CampaignMetricSnapshot",
  ClientGoal: "ClientGoal",
  CampaignGoal: "CampaignGoal",
  CampaignPreset: "CampaignPreset",
  RankingConfig: "RankingConfig",
  Alert: "Alert",
  AiRecommendation: "AiRecommendation",
  AuditLog: "AuditLog",
  NotificationState: "NotificationState",
  ClientMetaSettings: "ClientMetaSettings",
  SyncRun: "SyncRun",
  SyncQueueJob: "SyncQueueJob",
  TenantSyncState: "TenantSyncState",
  SavedView: "SavedView",
  ClientTag: "ClientTag",
  MetaAudienceCache: "MetaAudienceCache",
  LookalikeJob: "LookalikeJob",
  CampaignTemplate: "CampaignTemplate",
  CreativeAsset: "CreativeAsset",
  AutomationRule: "AutomationRule",
  ReportSchedule: "ReportSchedule",
  UserClient: "UserClient",
  TenantMember: "TenantMember",
  TenantInvite: "TenantInvite",
  Plan: "Plan",
  Subscription: "Subscription",
  BillingCustomer: "BillingCustomer",
  Invoice: "Invoice",
  BillingEvent: "BillingEvent",
  BillingJob: "BillingJob",
  RefundRequest: "RefundRequest",
  DiscountCoupon: "DiscountCoupon",
  CouponRedemption: "CouponRedemption",
  ClientLearning: "ClientLearning"
} as const;

function repositoryFor<T extends ObjectLiteral>(
  ds: DataSource,
  entityName: string
): Repository<T> {
  const meta = ds.entityMetadatas.find((m) => m.name === entityName);
  if (!meta) {
    throw new EntityMetadataNotFoundError(entityName);
  }
  return ds.getRepository(meta.target as EntityTarget<T>);
}

export async function repositories() {
  const ds = await getDataSource();
  return {
    tenant: repositoryFor<Tenant>(ds, ENTITY.Tenant),
    user: repositoryFor<User>(ds, ENTITY.User),
    client: repositoryFor<Client>(ds, ENTITY.Client),
    adAccount: repositoryFor<AdAccount>(ds, ENTITY.AdAccount),
    metaAuth: repositoryFor<MetaAuth>(ds, ENTITY.MetaAuth),
    metaBusiness: repositoryFor<MetaBusiness>(ds, ENTITY.MetaBusiness),
    metaPage: repositoryFor<MetaPage>(ds, ENTITY.MetaPage),
    metaAdAccountInventory: repositoryFor<MetaAdAccountInventory>(
      ds,
      ENTITY.MetaAdAccountInventory
    ),
    metricSnapshot: repositoryFor<MetricSnapshot>(ds, ENTITY.MetricSnapshot),
    campaignMetricSnapshot: repositoryFor<CampaignMetricSnapshot>(
      ds,
      ENTITY.CampaignMetricSnapshot
    ),
    clientGoal: repositoryFor<ClientGoal>(ds, ENTITY.ClientGoal),
    campaignGoal: repositoryFor<CampaignGoal>(ds, ENTITY.CampaignGoal),
    campaignPreset: repositoryFor<CampaignPreset>(ds, ENTITY.CampaignPreset),
    rankingConfig: repositoryFor<RankingConfig>(ds, ENTITY.RankingConfig),
    alert: repositoryFor<Alert>(ds, ENTITY.Alert),
    aiRecommendation: repositoryFor<AiRecommendation>(ds, ENTITY.AiRecommendation),
    auditLog: repositoryFor<AuditLog>(ds, ENTITY.AuditLog),
    notificationState: repositoryFor<NotificationState>(ds, ENTITY.NotificationState),
    clientMetaSettings: repositoryFor<ClientMetaSettings>(ds, ENTITY.ClientMetaSettings),
    syncRun: repositoryFor<SyncRun>(ds, ENTITY.SyncRun),
    syncQueueJob: repositoryFor<SyncQueueJob>(ds, ENTITY.SyncQueueJob),
    tenantSyncState: repositoryFor<TenantSyncState>(ds, ENTITY.TenantSyncState),
    savedView: repositoryFor<SavedView>(ds, ENTITY.SavedView),
    clientTag: repositoryFor<ClientTag>(ds, ENTITY.ClientTag),
    metaAudienceCache: repositoryFor<MetaAudienceCache>(ds, ENTITY.MetaAudienceCache),
    lookalikeJob: repositoryFor<LookalikeJob>(ds, ENTITY.LookalikeJob),
    campaignTemplate: repositoryFor<CampaignTemplate>(ds, ENTITY.CampaignTemplate),
    creativeAsset: repositoryFor<CreativeAsset>(ds, ENTITY.CreativeAsset),
    automationRule: repositoryFor<AutomationRule>(ds, ENTITY.AutomationRule),
    reportSchedule: repositoryFor<ReportSchedule>(ds, ENTITY.ReportSchedule),
    userClient: repositoryFor<UserClient>(ds, ENTITY.UserClient),
    tenantMember: repositoryFor<TenantMember>(ds, ENTITY.TenantMember),
    tenantInvite: repositoryFor<TenantInvite>(ds, ENTITY.TenantInvite),
    plan: repositoryFor<Plan>(ds, ENTITY.Plan),
    subscription: repositoryFor<Subscription>(ds, ENTITY.Subscription),
    billingCustomer: repositoryFor<BillingCustomer>(ds, ENTITY.BillingCustomer),
    invoice: repositoryFor<Invoice>(ds, ENTITY.Invoice),
    billingEvent: repositoryFor<BillingEvent>(ds, ENTITY.BillingEvent),
    billingJob: repositoryFor<BillingJob>(ds, ENTITY.BillingJob),
    refundRequest: repositoryFor<RefundRequest>(ds, ENTITY.RefundRequest),
    discountCoupon: repositoryFor<DiscountCoupon>(ds, ENTITY.DiscountCoupon),
    couponRedemption: repositoryFor<CouponRedemption>(ds, ENTITY.CouponRedemption),
    clientLearning: repositoryFor<ClientLearning>(ds, ENTITY.ClientLearning)
  };
}
