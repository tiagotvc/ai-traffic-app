import { getDataSource } from "@/db/data-source";
import type { AdAccount } from "@/db/entities/AdAccount";
import type { AiRecommendation } from "@/db/entities/AiRecommendation";
import type { Alert } from "@/db/entities/Alert";
import type { AuditLog } from "@/db/entities/AuditLog";
import type { AutomationRule } from "@/db/entities/AutomationRule";
import type { AutomationPendingAction } from "@/db/entities/AutomationPendingAction";
import type { CampaignGoal } from "@/db/entities/CampaignGoal";
import type { CampaignMetricSnapshot } from "@/db/entities/CampaignMetricSnapshot";
import type { AdMetricSnapshot } from "@/db/entities/AdMetricSnapshot";
import type { CampaignPreset } from "@/db/entities/CampaignPreset";
import type { CampaignTypeDefinition } from "@/db/entities/CampaignTypeDefinition";
import type { CustomMetric } from "@/db/entities/CustomMetric";
import type { CampaignTemplate } from "@/db/entities/CampaignTemplate";
import type { Client } from "@/db/entities/Client";
import type { ClientGoal } from "@/db/entities/ClientGoal";
import type { ClientMetaSettings } from "@/db/entities/ClientMetaSettings";
import type { ClientTag } from "@/db/entities/ClientTag";
import type { CreativeAsset } from "@/db/entities/CreativeAsset";
import type { MessageTemplate } from "@/db/entities/MessageTemplate";
import type { LookalikeJob } from "@/db/entities/LookalikeJob";
import type { AudienceInsightBreakdown } from "@/db/entities/AudienceInsightBreakdown";
import type { ClientSavedTargeting } from "@/db/entities/ClientSavedTargeting";
import type { UserPersona } from "@/db/entities/UserPersona";
import type { UserZone } from "@/db/entities/UserZone";
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
import type { PixAutomaticAuthorization } from "@/db/entities/PixAutomaticAuthorization";
import type { BillingEvent } from "@/db/entities/BillingEvent";
import type { BillingJob } from "@/db/entities/BillingJob";
import type { RefundRequest } from "@/db/entities/RefundRequest";
import type { DiscountCoupon } from "@/db/entities/DiscountCoupon";
import type { CouponRedemption } from "@/db/entities/CouponRedemption";
import type { ClientLearning } from "@/db/entities/ClientLearning";
import type { ClientActionSuggestion } from "@/db/entities/ClientActionSuggestion";
import type { ClientHypothesis } from "@/db/entities/ClientHypothesis";
import type { ClientDna } from "@/db/entities/ClientDna";
import type { ClientTimelineEvent } from "@/db/entities/ClientTimelineEvent";
import type { ClientExperiment } from "@/db/entities/ClientExperiment";
import type { ClientActionPlan } from "@/db/entities/ClientActionPlan";
import type { ClientActionPlanItem } from "@/db/entities/ClientActionPlanItem";
import type { TenantAddon } from "@/db/entities/TenantAddon";
import type { PlatformSetting } from "@/db/entities/PlatformSetting";
import type { TenantAiPolicy } from "@/db/entities/TenantAiPolicy";
import type { MarketMemory } from "@/db/entities/MarketMemory";
import type { DashboardAddon } from "@/db/entities/DashboardAddon";
import type { DashboardAiWidget } from "@/db/entities/DashboardAiWidget";
import type { DashboardLayout } from "@/db/entities/DashboardLayout";
import type { DashboardTemplate } from "@/db/entities/DashboardTemplate";
import type { DashboardWidgetInstance } from "@/db/entities/DashboardWidgetInstance";
import type { DashboardWidgetPermission } from "@/db/entities/DashboardWidgetPermission";
import type { VideoUploadSession } from "@/db/entities/VideoUploadSession";
import type { VideoUploadPart } from "@/db/entities/VideoUploadPart";
import type { ContactMessage } from "@/db/entities/ContactMessage";
import type { McpToken } from "@/db/entities/McpToken";
import type { CapiEventLog } from "@/db/entities/CapiEventLog";
import type { ReportTemplate } from "@/db/entities/ReportTemplate";
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
  AdMetricSnapshot: "AdMetricSnapshot",
  ClientGoal: "ClientGoal",
  CampaignGoal: "CampaignGoal",
  CampaignPreset: "CampaignPreset",
  CampaignTypeDefinition: "CampaignTypeDefinition",
  CustomMetric: "CustomMetric",
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
  AudienceInsightBreakdown: "AudienceInsightBreakdown",
  ClientSavedTargeting: "ClientSavedTargeting",
  UserPersona: "UserPersona",
  UserZone: "UserZone",
  CampaignTemplate: "CampaignTemplate",
  CreativeAsset: "CreativeAsset",
  MessageTemplate: "MessageTemplate",
  VideoUploadSession: "VideoUploadSession",
  VideoUploadPart: "VideoUploadPart",
  AutomationRule: "AutomationRule",
  AutomationPendingAction: "AutomationPendingAction",
  ReportSchedule: "ReportSchedule",
  UserClient: "UserClient",
  TenantMember: "TenantMember",
  TenantInvite: "TenantInvite",
  Plan: "Plan",
  Subscription: "Subscription",
  BillingCustomer: "BillingCustomer",
  Invoice: "Invoice",
  PixAutomaticAuthorization: "PixAutomaticAuthorization",
  BillingEvent: "BillingEvent",
  BillingJob: "BillingJob",
  RefundRequest: "RefundRequest",
  DiscountCoupon: "DiscountCoupon",
  CouponRedemption: "CouponRedemption",
  ClientLearning: "ClientLearning",
  ClientActionSuggestion: "ClientActionSuggestion",
  ClientHypothesis: "ClientHypothesis",
  ClientDna: "ClientDna",
  ClientTimelineEvent: "ClientTimelineEvent",
  ClientExperiment: "ClientExperiment",
  ClientActionPlan: "ClientActionPlan",
  ClientActionPlanItem: "ClientActionPlanItem",
  TenantAddon: "TenantAddon",
  PlatformSetting: "PlatformSetting",
  TenantAiPolicy: "TenantAiPolicy",
  MarketMemory: "MarketMemory",
  DashboardLayout: "DashboardLayout",
  DashboardWidgetInstance: "DashboardWidgetInstance",
  DashboardTemplate: "DashboardTemplate",
  DashboardWidgetPermission: "DashboardWidgetPermission",
  DashboardAiWidget: "DashboardAiWidget",
  DashboardAddon: "DashboardAddon",
  ContactMessage: "ContactMessage",
  McpToken: "McpToken",
  CapiEventLog: "CapiEventLog",
  ReportTemplate: "ReportTemplate"
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
    adMetricSnapshot: repositoryFor<AdMetricSnapshot>(ds, ENTITY.AdMetricSnapshot),
    clientGoal: repositoryFor<ClientGoal>(ds, ENTITY.ClientGoal),
    campaignGoal: repositoryFor<CampaignGoal>(ds, ENTITY.CampaignGoal),
    campaignPreset: repositoryFor<CampaignPreset>(ds, ENTITY.CampaignPreset),
    campaignTypeDefinition: repositoryFor<CampaignTypeDefinition>(
      ds,
      ENTITY.CampaignTypeDefinition
    ),
    customMetric: repositoryFor<CustomMetric>(ds, ENTITY.CustomMetric),
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
    audienceInsightBreakdown: repositoryFor<AudienceInsightBreakdown>(
      ds,
      ENTITY.AudienceInsightBreakdown
    ),
    clientSavedTargeting: repositoryFor<ClientSavedTargeting>(
      ds,
      ENTITY.ClientSavedTargeting
    ),
    userPersona: repositoryFor<UserPersona>(ds, ENTITY.UserPersona),
    userZone: repositoryFor<UserZone>(ds, ENTITY.UserZone),
    campaignTemplate: repositoryFor<CampaignTemplate>(ds, ENTITY.CampaignTemplate),
    creativeAsset: repositoryFor<CreativeAsset>(ds, ENTITY.CreativeAsset),
    messageTemplate: repositoryFor<MessageTemplate>(ds, ENTITY.MessageTemplate),
    videoUploadSession: repositoryFor<VideoUploadSession>(ds, ENTITY.VideoUploadSession),
    videoUploadPart: repositoryFor<VideoUploadPart>(ds, ENTITY.VideoUploadPart),
    automationRule: repositoryFor<AutomationRule>(ds, ENTITY.AutomationRule),
    automationPendingAction: repositoryFor<AutomationPendingAction>(
      ds,
      ENTITY.AutomationPendingAction
    ),
    reportSchedule: repositoryFor<ReportSchedule>(ds, ENTITY.ReportSchedule),
    userClient: repositoryFor<UserClient>(ds, ENTITY.UserClient),
    tenantMember: repositoryFor<TenantMember>(ds, ENTITY.TenantMember),
    tenantInvite: repositoryFor<TenantInvite>(ds, ENTITY.TenantInvite),
    plan: repositoryFor<Plan>(ds, ENTITY.Plan),
    subscription: repositoryFor<Subscription>(ds, ENTITY.Subscription),
    billingCustomer: repositoryFor<BillingCustomer>(ds, ENTITY.BillingCustomer),
    invoice: repositoryFor<Invoice>(ds, ENTITY.Invoice),
    pixAutomaticAuthorization: repositoryFor<PixAutomaticAuthorization>(
      ds,
      ENTITY.PixAutomaticAuthorization
    ),
    billingEvent: repositoryFor<BillingEvent>(ds, ENTITY.BillingEvent),
    billingJob: repositoryFor<BillingJob>(ds, ENTITY.BillingJob),
    refundRequest: repositoryFor<RefundRequest>(ds, ENTITY.RefundRequest),
    discountCoupon: repositoryFor<DiscountCoupon>(ds, ENTITY.DiscountCoupon),
    couponRedemption: repositoryFor<CouponRedemption>(ds, ENTITY.CouponRedemption),
    clientLearning: repositoryFor<ClientLearning>(ds, ENTITY.ClientLearning),
    clientActionSuggestion: repositoryFor<ClientActionSuggestion>(
      ds,
      ENTITY.ClientActionSuggestion
    ),
    clientHypothesis: repositoryFor<ClientHypothesis>(ds, ENTITY.ClientHypothesis),
    clientDna: repositoryFor<ClientDna>(ds, ENTITY.ClientDna),
    clientTimelineEvent: repositoryFor<ClientTimelineEvent>(ds, ENTITY.ClientTimelineEvent),
    clientExperiment: repositoryFor<ClientExperiment>(ds, ENTITY.ClientExperiment),
    clientActionPlan: repositoryFor<ClientActionPlan>(ds, ENTITY.ClientActionPlan),
    clientActionPlanItem: repositoryFor<ClientActionPlanItem>(ds, ENTITY.ClientActionPlanItem),
    tenantAddon: repositoryFor<TenantAddon>(ds, ENTITY.TenantAddon),
    platformSetting: repositoryFor<PlatformSetting>(ds, ENTITY.PlatformSetting),
    tenantAiPolicy: repositoryFor<TenantAiPolicy>(ds, ENTITY.TenantAiPolicy),
    marketMemory: repositoryFor<MarketMemory>(ds, ENTITY.MarketMemory),
    dashboardLayout: repositoryFor<DashboardLayout>(ds, ENTITY.DashboardLayout),
    dashboardWidgetInstance: repositoryFor<DashboardWidgetInstance>(
      ds,
      ENTITY.DashboardWidgetInstance
    ),
    dashboardTemplate: repositoryFor<DashboardTemplate>(ds, ENTITY.DashboardTemplate),
    dashboardWidgetPermission: repositoryFor<DashboardWidgetPermission>(
      ds,
      ENTITY.DashboardWidgetPermission
    ),
    dashboardAiWidget: repositoryFor<DashboardAiWidget>(ds, ENTITY.DashboardAiWidget),
    dashboardAddon: repositoryFor<DashboardAddon>(ds, ENTITY.DashboardAddon),
    contactMessage: repositoryFor<ContactMessage>(ds, ENTITY.ContactMessage),
    mcpToken: repositoryFor<McpToken>(ds, ENTITY.McpToken),
    capiEventLog: repositoryFor<CapiEventLog>(ds, ENTITY.CapiEventLog),
    reportTemplate: repositoryFor<ReportTemplate>(ds, ENTITY.ReportTemplate)
  };
}
