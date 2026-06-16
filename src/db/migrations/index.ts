import { Init1735689600000 } from "./0001-Init";
import { UserPasswordHash1735689700000 } from "./0002-UserPasswordHash";
import { GoalsAndCampaignMetrics1735690000000 } from "./0003-GoalsAndCampaignMetrics";
import { ClientMetaPublish1735690100000 } from "./0004-ClientMetaPublish";
import { AgencyPlatform1735690200000 } from "./0005-AgencyPlatform";
import { MetaBusinessAssets1735690300000 } from "./0006-MetaBusinessAssets";
import { ClientMetaBusiness1735690400000 } from "./0007-ClientMetaBusiness";
import { ManagerFeatures1735690500000 } from "./0008-ManagerFeatures";
import { WorkspaceMembers1735690600000 } from "./0009-WorkspaceMembers";
import { TenantMetaConnection1735690700000 } from "./0010-TenantMetaConnection";
import { AdAccountTimezone1735690800000 } from "./0011-AdAccountTimezone";
import { ReachAndMessages1735690900000 } from "./0012-ReachAndMessages";
import { CampaignPresets1735691000000 } from "./0013-CampaignPresets";
import { BillingModule1735691100000 } from "./0014-BillingModule";
import { BillingPlansV2_1735691200000 } from "./0015-BillingPlansV2";
import { InvoiceBillingCycle_1735691300000 } from "./0016-InvoiceBillingCycle";
import { CouponsAndPlatformRole_1735691400000 } from "./0017-CouponsAndPlatformRole";
import { SocialAuthAndGoogleAds_1735691500000 } from "./0018-SocialAuthAndGoogleAds";
import { InvoiceCurrencyFields_1735691600000 } from "./0019-InvoiceCurrencyFields";
import { ClientLearnings_1735691700000 } from "./0020-ClientLearnings";
import { TenantAddons_1735691800000 } from "./0021-TenantAddons";
import { ClientMetaSettingsDashboardPrefs_1735691900000 } from "./0022-ClientMetaSettingsDashboardPrefs";
import { TenantMemberDashboardPrefs_1735692000000 } from "./0023-TenantMemberDashboardPrefs";
import { TenantMemberClientMetricPref_1735692100000 } from "./0024-TenantMemberClientMetricPref";
import { ClientActionSuggestions_1735692200000 } from "./0025-ClientActionSuggestions";
import { TenantGeminiModel_1735692300000 } from "./0026-TenantGeminiModel";
import { AgencyBrainCore_1735692400000 } from "./0027-AgencyBrainCore";
import { AgencyBrainNicheOptIn_1735692500000 } from "./0028-AgencyBrainNicheOptIn";
import { RankingConfig1735691100000 } from "./0014-RankingConfig";
import { HistoricalBackfillQueue1735820000000 } from "./0029-HistoricalBackfillQueue";
import { AdMetricSnapshots1735830000000 } from "./0030-AdMetricSnapshots";
import { ClientExperimentForecast1735830100000 } from "./0031-ClientExperimentForecast";
import { CampaignSnapshotDayIndex1735830200000 } from "./0032-CampaignSnapshotDayIndex";
import { CampaignTypeDefinitions1735830300000 } from "./0033-CampaignTypeDefinitions";
import { TenantMemberCampaignTableLayouts1735830400000 } from "./0034-TenantMemberCampaignTableLayouts";
import { CustomMetrics1735830500000 } from "./0035-CustomMetrics";

/** Fonte única das migrações, em ordem. Usada pelo runner (db:migrate) e pelo runtime. */
export const appMigrations = [
  Init1735689600000,
  UserPasswordHash1735689700000,
  GoalsAndCampaignMetrics1735690000000,
  ClientMetaPublish1735690100000,
  AgencyPlatform1735690200000,
  MetaBusinessAssets1735690300000,
  ClientMetaBusiness1735690400000,
  ManagerFeatures1735690500000,
  WorkspaceMembers1735690600000,
  TenantMetaConnection1735690700000,
  AdAccountTimezone1735690800000,
  ReachAndMessages1735690900000,
  CampaignPresets1735691000000,
  RankingConfig1735691100000,
  BillingModule1735691100000,
  BillingPlansV2_1735691200000,
  InvoiceBillingCycle_1735691300000,
  CouponsAndPlatformRole_1735691400000,
  SocialAuthAndGoogleAds_1735691500000,
  InvoiceCurrencyFields_1735691600000,
  ClientLearnings_1735691700000,
  TenantAddons_1735691800000,
  ClientMetaSettingsDashboardPrefs_1735691900000,
  TenantMemberDashboardPrefs_1735692000000,
  TenantMemberClientMetricPref_1735692100000,
  ClientActionSuggestions_1735692200000,
  TenantGeminiModel_1735692300000,
  AgencyBrainCore_1735692400000,
  AgencyBrainNicheOptIn_1735692500000,
  HistoricalBackfillQueue1735820000000,
  AdMetricSnapshots1735830000000,
  ClientExperimentForecast1735830100000,
  CampaignSnapshotDayIndex1735830200000,
  CampaignTypeDefinitions1735830300000,
  TenantMemberCampaignTableLayouts1735830400000,
  CustomMetrics1735830500000
];
