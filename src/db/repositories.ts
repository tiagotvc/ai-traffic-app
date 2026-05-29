import { getDataSource } from "@/db/data-source";
import type { AdAccount } from "@/db/entities/AdAccount";
import type { AiRecommendation } from "@/db/entities/AiRecommendation";
import type { Alert } from "@/db/entities/Alert";
import type { AuditLog } from "@/db/entities/AuditLog";
import type { AutomationRule } from "@/db/entities/AutomationRule";
import type { CampaignGoal } from "@/db/entities/CampaignGoal";
import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { CampaignTemplate } from "@/db/entities/CampaignTemplate";
import type { Client } from "@/db/entities/Client";
import type { ClientGoal } from "@/db/entities/ClientGoal";
import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { ClientTag } from "@/db/entities/ClientTag";
import type { CreativeAsset } from "@/db/entities/CreativeAsset";
import type { LookalikeJob } from "@/db/entities/LookalikeJob";
import type { MetaAuth } from "@/db/entities/MetaAuth";
import type { MetaAudienceCache } from "@/db/entities/MetaAudienceCache";
import type { MetaAdAccountInventory } from "@/db/entities/MetaAdAccountInventory";
import type { MetaBusiness } from "@/db/entities/MetaBusiness";
import type { MetaPage } from "@/db/entities/MetaPage";
import type { MetricSnapshot } from "@/db/entities/MetricSnapshot";
import type { NotificationState } from "@/db/entities/NotificationState";
import type { SavedView } from "@/db/entities/SavedView";
import type { SyncQueueJob } from "@/db/entities/SyncQueueJob";
import type { SyncRun } from "@/db/entities/SyncRun";
import type { Tenant } from "@/db/entities/Tenant";
import type { TenantSyncState } from "@/db/entities/TenantSyncState";
import type { User } from "@/db/entities/User";
import type { UserClient } from "@/db/entities/UserClient";

const E = {
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
  UserClient: "UserClient"
} as const;

export async function repositories() {
  const ds = await getDataSource();
  return {
    tenant: ds.getRepository<Tenant>(E.Tenant),
    user: ds.getRepository<User>(E.User),
    client: ds.getRepository<Client>(E.Client),
    adAccount: ds.getRepository<AdAccount>(E.AdAccount),
    metaAuth: ds.getRepository<MetaAuth>(E.MetaAuth),
    metaBusiness: ds.getRepository<MetaBusiness>(E.MetaBusiness),
    metaPage: ds.getRepository<MetaPage>(E.MetaPage),
    metaAdAccountInventory: ds.getRepository<MetaAdAccountInventory>(E.MetaAdAccountInventory),
    metricSnapshot: ds.getRepository<MetricSnapshot>(E.MetricSnapshot),
    campaignMetricSnapshot: ds.getRepository<CampaignMetricSnapshot>(E.CampaignMetricSnapshot),
    clientGoal: ds.getRepository<ClientGoal>(E.ClientGoal),
    campaignGoal: ds.getRepository<CampaignGoal>(E.CampaignGoal),
    alert: ds.getRepository<Alert>(E.Alert),
    aiRecommendation: ds.getRepository<AiRecommendation>(E.AiRecommendation),
    auditLog: ds.getRepository<AuditLog>(E.AuditLog),
    notificationState: ds.getRepository<NotificationState>(E.NotificationState),
    clientMetaSettings: ds.getRepository<ClientMetaSettings>(E.ClientMetaSettings),
    syncRun: ds.getRepository<SyncRun>(E.SyncRun),
    syncQueueJob: ds.getRepository<SyncQueueJob>(E.SyncQueueJob),
    tenantSyncState: ds.getRepository<TenantSyncState>(E.TenantSyncState),
    savedView: ds.getRepository<SavedView>(E.SavedView),
    clientTag: ds.getRepository<ClientTag>(E.ClientTag),
    metaAudienceCache: ds.getRepository<MetaAudienceCache>(E.MetaAudienceCache),
    lookalikeJob: ds.getRepository<LookalikeJob>(E.LookalikeJob),
    campaignTemplate: ds.getRepository<CampaignTemplate>(E.CampaignTemplate),
    creativeAsset: ds.getRepository<CreativeAsset>(E.CreativeAsset),
    automationRule: ds.getRepository<AutomationRule>(E.AutomationRule),
    userClient: ds.getRepository<UserClient>(E.UserClient)
  };
}
