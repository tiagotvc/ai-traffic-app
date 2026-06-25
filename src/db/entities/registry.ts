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
import { AdMetricSnapshot } from "./AdMetricSnapshot";
import { ClientGoal } from "./ClientGoal";
import { CampaignGoal } from "./CampaignGoal";
import { CampaignPreset } from "./CampaignPreset";
import { CampaignTypeDefinition } from "./CampaignTypeDefinition";
import { CustomMetric } from "./CustomMetric";
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
import { AudienceInsightBreakdown } from "./AudienceInsightBreakdown";
import { ClientSavedTargeting } from "./ClientSavedTargeting";
import { UserPersona } from "./UserPersona";
import { UserZone } from "./UserZone";
import { CampaignTemplate } from "./CampaignTemplate";
import { CreativeAsset } from "./CreativeAsset";
import { MessageTemplate } from "./MessageTemplate";
import { VideoUploadSession } from "./VideoUploadSession";
import { VideoUploadPart } from "./VideoUploadPart";
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
import { ClientActionSuggestion } from "./ClientActionSuggestion";
import { ClientHypothesis } from "./ClientHypothesis";
import { ClientDna } from "./ClientDna";
import { ClientTimelineEvent } from "./ClientTimelineEvent";
import { ClientExperiment } from "./ClientExperiment";
import { ClientActionPlan } from "./ClientActionPlan";
import { ClientActionPlanItem } from "./ClientActionPlanItem";
import { MarketMemory } from "./MarketMemory";
import { DashboardLayout } from "./DashboardLayout";
import { DashboardWidgetInstance } from "./DashboardWidgetInstance";
import { DashboardTemplate } from "./DashboardTemplate";
import { DashboardWidgetPermission } from "./DashboardWidgetPermission";
import { DashboardAiWidget } from "./DashboardAiWidget";
import { DashboardAddon } from "./DashboardAddon";
import { TenantAddon } from "./TenantAddon";
import { ContactMessage } from "./ContactMessage";
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
  AdMetricSnapshot,
  ClientGoal,
  CampaignGoal,
  CampaignPreset,
  CampaignTypeDefinition,
  CustomMetric,
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
  AudienceInsightBreakdown,
  ClientSavedTargeting,
  UserPersona,
  UserZone,
  CampaignTemplate,
  CreativeAsset,
  MessageTemplate,
  VideoUploadSession,
  VideoUploadPart,
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
  ClientLearning,
  ClientActionSuggestion,
  ClientHypothesis,
  ClientDna,
  ClientTimelineEvent,
  ClientExperiment,
  ClientActionPlan,
  ClientActionPlanItem,
  TenantAddon,
  MarketMemory,
  DashboardLayout,
  DashboardWidgetInstance,
  DashboardTemplate,
  DashboardWidgetPermission,
  DashboardAiWidget,
  DashboardAddon,
  ContactMessage
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
export type {
  ActionSuggestionType,
  ActionSuggestionSource,
  ActionSuggestionStatus,
  ActionSuggestionPriority
} from "./ClientActionSuggestion";
export type { DnaBucket } from "./ClientDna";
export type { HypothesisStatus, HypothesisSource } from "./ClientHypothesis";
export type { TimelineEventType } from "./ClientTimelineEvent";
export type { ActionPlanStatus } from "./ClientActionPlan";
export type { ActionPlanItemStatus } from "./ClientActionPlanItem";

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
  { ctor: AdMetricSnapshot, name: "AdMetricSnapshot" },
  { ctor: ClientGoal, name: "ClientGoal" },
  { ctor: CampaignGoal, name: "CampaignGoal" },
  { ctor: CampaignPreset, name: "CampaignPreset" },
  { ctor: CampaignTypeDefinition, name: "CampaignTypeDefinition" },
  { ctor: CustomMetric, name: "CustomMetric" },
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
  { ctor: AudienceInsightBreakdown, name: "AudienceInsightBreakdown" },
  { ctor: ClientSavedTargeting, name: "ClientSavedTargeting" },
  { ctor: UserPersona, name: "UserPersona" },
  { ctor: UserZone, name: "UserZone" },
  { ctor: CampaignTemplate, name: "CampaignTemplate" },
  { ctor: CreativeAsset, name: "CreativeAsset" },
  { ctor: MessageTemplate, name: "MessageTemplate" },
  { ctor: VideoUploadSession, name: "VideoUploadSession" },
  { ctor: VideoUploadPart, name: "VideoUploadPart" },
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
  { ctor: ClientLearning, name: "ClientLearning" },
  { ctor: ClientActionSuggestion, name: "ClientActionSuggestion" },
  { ctor: ClientHypothesis, name: "ClientHypothesis" },
  { ctor: ClientDna, name: "ClientDna" },
  { ctor: ClientTimelineEvent, name: "ClientTimelineEvent" },
  { ctor: ClientExperiment, name: "ClientExperiment" },
  { ctor: ClientActionPlan, name: "ClientActionPlan" },
  { ctor: ClientActionPlanItem, name: "ClientActionPlanItem" },
  { ctor: TenantAddon, name: "TenantAddon" },
  { ctor: MarketMemory, name: "MarketMemory" },
  { ctor: DashboardLayout, name: "DashboardLayout" },
  { ctor: DashboardWidgetInstance, name: "DashboardWidgetInstance" },
  { ctor: DashboardTemplate, name: "DashboardTemplate" },
  { ctor: DashboardWidgetPermission, name: "DashboardWidgetPermission" },
  { ctor: DashboardAiWidget, name: "DashboardAiWidget" },
  { ctor: DashboardAddon, name: "DashboardAddon" },
  { ctor: ContactMessage, name: "ContactMessage" }
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
  AdMetricSnapshot,
  ClientGoal,
  CampaignGoal,
  CampaignPreset,
  CampaignTypeDefinition,
  CustomMetric,
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
  AudienceInsightBreakdown,
  ClientSavedTargeting,
  UserPersona,
  UserZone,
  CampaignTemplate,
  CreativeAsset,
  MessageTemplate,
  VideoUploadSession,
  VideoUploadPart,
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
  ClientLearning,
  ClientActionSuggestion,
  ClientHypothesis,
  ClientDna,
  ClientTimelineEvent,
  ClientExperiment,
  ClientActionPlan,
  ClientActionPlanItem,
  TenantAddon,
  MarketMemory,
  DashboardLayout,
  DashboardWidgetInstance,
  DashboardTemplate,
  DashboardWidgetPermission,
  DashboardAiWidget,
  DashboardAddon,
  ContactMessage
] as const;
