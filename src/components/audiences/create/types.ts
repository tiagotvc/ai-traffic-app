"use client";

export type CreateAudienceType =
  | "website"
  | "engagement"
  | "customer_list"
  | "app"
  | "lookalike"
  | "saved"
  | "combine"
  | "ai";

export type SavedAudienceSummary = {
  id: string;
  name: string;
  kind: string;
  subtype?: string;
  clientName: string;
  clientSlug: string;
  clientId: string;
  adAccountId: string;
  sourceLabel: string;
  country?: string;
  ratioPct?: number;
  updatedAt: string;
  approximateCount?: number;
};

export type AudienceCreateContext = {
  clientSlug: string;
  clientName: string;
  adAccountId: string;
  audiences: SavedAudienceSummary[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onRefresh: () => void;
};

export type AudienceOptions = {
  pixels: Array<{ id: string; name: string }>;
  pages: Array<{ id: string; name: string }>;
  instagramAccounts: Array<{ id: string; name: string }>;
  websiteEvents: Array<{ id: string; labelKey: string; metaEvent: string; isCustom?: boolean }>;
  websiteMaxRetentionDays: number;
  engagementSources: Array<{ id: string; labelKey: string; maxRetentionDays: number }>;
  engagementActions: Record<
    string,
    Array<{ id: string; labelKey: string; metaEvent: string; maxRetentionDays: number }>
  >;
};
