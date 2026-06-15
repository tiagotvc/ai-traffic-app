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
import { CampaignPreset } from "./CampaignPreset";
import { RankingConfig } from "./RankingConfig";
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
import { ReportSchedule } from "./ReportSchedule";
import { UserClient } from "./UserClient";
import { TenantMember } from "./TenantMember";
import { TenantInvite } from "./TenantInvite";
import { Plan } from "./Plan";
import { Subscription } from "./Subscription";
import { BillingCustomer } from "./BillingCustomer";
import { Invoice } from "./Invoice";
import { BillingEvent } from "./BillingEvent";
import { BillingJob } from "./BillingJob";
import { RefundRequest } from "./RefundRequest";
import { DiscountCoupon } from "./DiscountCoupon";
import { CouponRedemption } from "./CouponRedemption";
import { GoogleAuth } from "./GoogleAuth";
import { ClientLearning } from "./ClientLearning";
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
  CampaignPreset,
  RankingConfig,
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
  ReportSchedule,
  UserClient,
  TenantMember,
  TenantInvite,
  Plan,
  Subscription,
  BillingCustomer,
  Invoice,
  BillingEvent,
  BillingJob,
  RefundRequest,
  DiscountCoupon,
  CouponRedemption,
  GoogleAuth,
  ClientLearning
};

export type { AlertType, AlertSeverity } from "./Alert";
export type { GoalObjective } from "./ClientGoal";
export type { ClientTargeting, SyncPriority } from "./ClientMetaSettings";
export type {
  LearningCategory,
  LearningImpact,
  LearningConfidence,
  LearningSource,
  LearningStatus
} from "./ClientLearning";

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
  { ctor: CampaignPreset, name: "CampaignPreset" },
  { ctor: RankingConfig, name: "RankingConfig" },
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
  { ctor: ReportSchedule, name: "ReportSchedule" },
  { ctor: UserClient, name: "UserClient" },
  { ctor: TenantMember, name: "TenantMember" },
  { ctor: TenantInvite, name: "TenantInvite" },
  { ctor: Plan, name: "Plan" },
  { ctor: Subscription, name: "Subscription" },
  { ctor: BillingCustomer, name: "BillingCustomer" },
  { ctor: Invoice, name: "Invoice" },
  { ctor: BillingEvent, name: "BillingEvent" },
  { ctor: BillingJob, name: "BillingJob" },
  { ctor: RefundRequest, name: "RefundRequest" },
  { ctor: DiscountCoupon, name: "DiscountCoupon" },
  { ctor: CouponRedemption, name: "CouponRedemption" },
  { ctor: GoogleAuth, name: "GoogleAuth" },
  { ctor: ClientLearning, name: "ClientLearning" }
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
  CampaignPreset,
  RankingConfig,
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
  ReportSchedule,
  UserClient,
  TenantMember,
  TenantInvite,
  Plan,
  Subscription,
  BillingCustomer,
  Invoice,
  BillingEvent,
  BillingJob,
  RefundRequest,
  DiscountCoupon,
  CouponRedemption,
  GoogleAuth,
  ClientLearning
] as const;
