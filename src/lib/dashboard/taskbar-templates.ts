import {
  createCompositeSlot,
  defaultSlotWeight,
  type CompositeSlotKind,
  type TaskbarOrientation,
  type TaskbarSlot
} from "@/lib/dashboard/taskbar-config";

export type TaskbarTemplateSpec = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  premium?: boolean;
  orientation: TaskbarOrientation;
  /** Proporções visuais dos blocos no thumbnail (1–5). */
  thumbWeights: number[];
  thumbKinds: CompositeSlotKind[];
  build: (orientation: TaskbarOrientation) => TaskbarSlot[];
};

function slot(
  kind: CompositeSlotKind,
  orientation: TaskbarOrientation,
  overrides: Record<string, unknown> = {}
): TaskbarSlot {
  const base = createCompositeSlot(kind, orientation);
  return {
    ...base,
    config: { ...base.config, ...overrides }
  };
}

export const TASKBAR_TEMPLATES: TaskbarTemplateSpec[] = [
  {
    id: "command-center",
    titleKey: "taskbarTplCommandCenter",
    descriptionKey: "taskbarTplCommandCenterDesc",
    orientation: "horizontal",
    thumbKinds: ["metric", "chart", "alerts"],
    thumbWeights: [1, 3, 2],
    build: (o) => [
      slot("metric", o, { metricKey: "spend", slotWeight: 1 }),
      slot("chart", o, {
        chartMetrics: ["spend", "roas"],
        chartStyle: "area",
        slotWeight: 3
      }),
      slot("alerts", o, { density: "inline", slotWeight: 2 })
    ]
  },
  {
    id: "kpi-strip",
    titleKey: "taskbarTplKpiStrip",
    descriptionKey: "taskbarTplKpiStripDesc",
    orientation: "horizontal",
    thumbKinds: ["metric", "metric", "metric"],
    thumbWeights: [1, 1, 1],
    build: (o) => [
      slot("metric", o, { metricKey: "spend", slotWeight: 1 }),
      slot("metric", o, { metricKey: "roas", slotWeight: 1 }),
      slot("metric", o, { metricKey: "conversions", slotWeight: 1 })
    ]
  },
  {
    id: "chart-focus",
    titleKey: "taskbarTplChartFocus",
    descriptionKey: "taskbarTplChartFocusDesc",
    orientation: "horizontal",
    thumbKinds: ["metric", "chart"],
    thumbWeights: [1, 4],
    build: (o) => [
      slot("metric", o, { metricKey: "spend", slotWeight: 1 }),
      slot("chart", o, {
        chartMetrics: ["spend", "impressions", "ctr"],
        chartStyle: "line",
        slotWeight: 4
      })
    ]
  },
  {
    id: "alerts-rail",
    titleKey: "taskbarTplAlertsRail",
    descriptionKey: "taskbarTplAlertsRailDesc",
    orientation: "horizontal",
    thumbKinds: ["chart", "alerts"],
    thumbWeights: [2, 2],
    build: (o) => [
      slot("chart", o, {
        chartMetrics: ["spend", "cpa"],
        chartStyle: "bar",
        slotWeight: 2
      }),
      slot("alerts", o, { density: "inline", slotWeight: 2 })
    ]
  },
  {
    id: "vertical-briefing",
    titleKey: "taskbarTplVerticalBriefing",
    descriptionKey: "taskbarTplVerticalBriefingDesc",
    orientation: "vertical",
    thumbKinds: ["chart", "metric", "alerts"],
    thumbWeights: [3, 1, 2],
    build: (o) => [
      slot("chart", o, {
        chartMetrics: ["spend", "roas"],
        chartStyle: "area",
        slotWeight: 3
      }),
      slot("metric", o, { metricKey: "roas", cardStyle: "centered", slotWeight: 2 }),
      slot("alerts", o, { density: "stacked", slotWeight: 2 })
    ]
  },
  {
    id: "premium-studio",
    titleKey: "taskbarTplPremiumStudio",
    descriptionKey: "taskbarTplPremiumStudioDesc",
    premium: true,
    orientation: "horizontal",
    thumbKinds: ["metric", "chart", "chart", "alerts"],
    thumbWeights: [1, 2, 2, 2],
    build: (o) => [
      slot("metric", o, { metricKey: "spend", slotWeight: 1 }),
      slot("chart", o, {
        chartMetrics: ["spend", "roas"],
        chartStyle: "donut",
        slotWeight: 2,
        visual: { lineStrokeWidth: 3, barThickness: 3 }
      }),
      slot("chart", o, {
        chartMetrics: ["impressions", "ctr"],
        chartStyle: "radar",
        slotWeight: 2,
        visual: { lineStrokeWidth: 2 }
      }),
      slot("alerts", o, { density: "inline", slotWeight: 2 })
    ]
  }
];

export function getTaskbarTemplate(id: string): TaskbarTemplateSpec | undefined {
  return TASKBAR_TEMPLATES.find((t) => t.id === id);
}

export function buildTaskbarConfigFromTemplate(
  templateId: string,
  orientationOverride?: TaskbarOrientation
): Record<string, unknown> | null {
  const tpl = getTaskbarTemplate(templateId);
  if (!tpl) return null;
  const orientation = orientationOverride ?? tpl.orientation;
  const slots =
    orientation === tpl.orientation
      ? tpl.build(orientation)
      : tpl.build(orientation).map((s) => {
          const kind = s.widgetType === "alerts.feed"
            ? "alerts"
            : s.widgetType.startsWith("chart.")
              ? "chart"
              : "metric";
          const compact = orientation === "horizontal";
          if (kind === "metric") {
            return {
              ...s,
              config: {
                ...s.config,
                cardStyle: compact ? "compact" : "centered"
              }
            };
          }
          if (kind === "alerts") {
            return {
              ...s,
              config: { ...s.config, density: compact ? "inline" : "stacked" }
            };
          }
          return s;
        });

  return { orientation, slots };
}

/** Gera slots de demo com IDs estáveis para preview de template. */
export function templatePreviewConfig(tpl: TaskbarTemplateSpec): Record<string, unknown> {
  return { orientation: tpl.orientation, slots: tpl.build(tpl.orientation) };
}

export function thumbBlockColor(kind: CompositeSlotKind): string {
  switch (kind) {
    case "chart":
      return "rgba(99,102,241,0.45)";
    case "alerts":
      return "rgba(245,158,11,0.4)";
    default:
      return "rgba(16,185,129,0.4)";
  }
}

export function defaultThumbWeights(kinds: CompositeSlotKind[]): number[] {
  return kinds.map((k) => defaultSlotWeight(k));
}
