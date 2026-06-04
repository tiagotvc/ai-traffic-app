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
  TenantMetaConnection1735690700000
];
