/**
 * Único ponto de import/export das entidades — evita EntityMetadataNotFoundError
 * quando o Turbopack duplica módulos (barrel vs data-source).
 */
import { Tenant } from "./Tenant";
import { User } from "./User";
import { Client } from "./Client";
import { AdAccount } from "./AdAccount";
import { MetaAuth } from "./MetaAuth";
import { MetaBusiness } from "./MetaBusiness";
import { MetaPage } from "./MetaPage";
import { MetaAdAccountInventory } from "./MetaAdAccountInventory";
import { MetricSnapshot } from "./MetricSnapshot";
import { CampaignMetricSnapshot } from "./CampaignMetricSnapshot";
import { ClientGoal } from "./ClientGoal";
import { CampaignGoal } from "./CampaignGoal";
import { Alert } from "./Alert";
import { AiRecommendation } from "./AiRecommendation";
import { AuditLog } from "./AuditLog";
import { NotificationState } from "./NotificationState";
import { ClientMetaSettings } from "./ClientMetaSettings";
import { SyncRun } from "./SyncRun";
import { SyncQueueJob } from "./SyncQueueJob";
import { TenantSyncState } from "./TenantSyncState";
import { SavedView } from "./SavedView";
import { ClientTag } from "./ClientTag";
import { MetaAudienceCache } from "./MetaAudienceCache";
import { LookalikeJob } from "./LookalikeJob";
import { CampaignTemplate } from "./CampaignTemplate";
import { CreativeAsset } from "./CreativeAsset";
import { AutomationRule } from "./AutomationRule";
import { UserClient } from "./UserClient";
import { stabilizeTypeOrmEntityNames } from "../stabilize-entity-names";

export {
  Tenant,
  User,
  Client,
  AdAccount,
  MetaAuth,
  MetaBusiness,
  MetaPage,
  MetaAdAccountInventory,
  MetricSnapshot,
  CampaignMetricSnapshot,
  ClientGoal,
  CampaignGoal,
  Alert,
  AiRecommendation,
  AuditLog,
  NotificationState,
  ClientMetaSettings,
  SyncRun,
  SyncQueueJob,
  TenantSyncState,
  SavedView,
  ClientTag,
  MetaAudienceCache,
  LookalikeJob,
  CampaignTemplate,
  CreativeAsset,
  AutomationRule,
  UserClient
};

export type { AlertType, AlertSeverity } from "./Alert";
export type { GoalObjective } from "./ClientGoal";
export type { ClientTargeting, SyncPriority } from "./ClientMetaSettings";

stabilizeTypeOrmEntityNames([
  { ctor: Tenant, name: "Tenant" },
  { ctor: User, name: "User" },
  { ctor: Client, name: "Client" },
  { ctor: AdAccount, name: "AdAccount" },
  { ctor: MetaAuth, name: "MetaAuth" },
  { ctor: MetaBusiness, name: "MetaBusiness" },
  { ctor: MetaPage, name: "MetaPage" },
  { ctor: MetaAdAccountInventory, name: "MetaAdAccountInventory" },
  { ctor: MetricSnapshot, name: "MetricSnapshot" },
  { ctor: CampaignMetricSnapshot, name: "CampaignMetricSnapshot" },
  { ctor: ClientGoal, name: "ClientGoal" },
  { ctor: CampaignGoal, name: "CampaignGoal" },
  { ctor: Alert, name: "Alert" },
  { ctor: AiRecommendation, name: "AiRecommendation" },
  { ctor: AuditLog, name: "AuditLog" },
  { ctor: NotificationState, name: "NotificationState" },
  { ctor: ClientMetaSettings, name: "ClientMetaSettings" },
  { ctor: SyncRun, name: "SyncRun" },
  { ctor: SyncQueueJob, name: "SyncQueueJob" },
  { ctor: TenantSyncState, name: "TenantSyncState" },
  { ctor: SavedView, name: "SavedView" },
  { ctor: ClientTag, name: "ClientTag" },
  { ctor: MetaAudienceCache, name: "MetaAudienceCache" },
  { ctor: LookalikeJob, name: "LookalikeJob" },
  { ctor: CampaignTemplate, name: "CampaignTemplate" },
  { ctor: CreativeAsset, name: "CreativeAsset" },
  { ctor: AutomationRule, name: "AutomationRule" },
  { ctor: UserClient, name: "UserClient" }
]);

export const typeOrmEntities = [
  Tenant,
  User,
  Client,
  AdAccount,
  MetaAuth,
  MetaBusiness,
  MetaPage,
  MetaAdAccountInventory,
  MetricSnapshot,
  CampaignMetricSnapshot,
  ClientGoal,
  CampaignGoal,
  Alert,
  AiRecommendation,
  AuditLog,
  NotificationState,
  ClientMetaSettings,
  SyncRun,
  SyncQueueJob,
  TenantSyncState,
  SavedView,
  ClientTag,
  MetaAudienceCache,
  LookalikeJob,
  CampaignTemplate,
  CreativeAsset,
  AutomationRule,
  UserClient
] as const;
