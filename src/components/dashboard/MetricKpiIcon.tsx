"use client";

import {
  BarChart2,
  CircleDollarSign,
  Eye,
  Gauge,
  MessageCircle,
  MousePointerClick,
  Percent,
  Repeat2,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
  type LucideIcon
} from "lucide-react";

import type { MetricKey } from "@/lib/dashboard-metrics";

const METRIC_ICONS: Record<MetricKey, LucideIcon> = {
  spend: CircleDollarSign,
  impressions: Eye,
  reach: Users,
  frequency: Repeat2,
  clicks: MousePointerClick,
  ctr: Target,
  cpc: CircleDollarSign,
  cpm: BarChart2,
  conversions: ShoppingCart,
  cpa: CircleDollarSign,
  messages: MessageCircle,
  cpmsg: MessageCircle,
  roas: TrendingUp
};

export function MetricKpiIcon({
  metricKey,
  color,
  size = 16
}: {
  metricKey?: MetricKey;
  color: string;
  size?: number;
}) {
  const Icon = (metricKey && METRIC_ICONS[metricKey]) ?? Gauge;
  return <Icon size={size} strokeWidth={2} style={{ color }} />;
}
