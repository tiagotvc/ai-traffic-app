import type {
  TableBlockConfig,
  TableBorderRadius,
  TableDensity,
  TableHeaderStyle,
  TableStylePreset,
  TableTextAlign
} from "@/lib/dashboard/app-block-config";

export type TableStyleTokens = {
  wrapper: string;
  headerRow: string;
  headerCell: string;
  bodyRow: string;
  bodyCell: string;
  titleBar?: string;
};

export const TABLE_STYLE_PRESETS: Record<
  TableStylePreset,
  { labelKey: string; tokens: TableStyleTokens }
> = {
  minimal: {
    labelKey: "tableStyleMinimal",
    tokens: {
      wrapper: "border-0 shadow-none",
      headerRow: "border-0 bg-transparent",
      headerCell:
        "pb-2 pr-3 text-[11px] font-medium text-[var(--text-dimmer)] first:pl-0 last:pr-0",
      bodyRow: "border-t border-[var(--border-color)] hover:bg-[var(--surface-bg)]/30",
      bodyCell: "py-2 pr-3 text-[11px] tabular-nums text-[var(--text-main)] first:pl-0 last:pr-0"
    }
  },
  striped: {
    labelKey: "tableStyleStriped",
    tokens: {
      wrapper: "border border-[var(--border-color)]",
      headerRow: "border-b bg-[var(--surface-thead)]",
      headerCell: "px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]",
      bodyRow: "odd:bg-[var(--surface-bg)]/30 even:bg-transparent border-b border-[var(--border-color)] last:border-0",
      bodyCell: "px-3 py-2.5 text-sm tabular-nums"
    }
  },
  bordered: {
    labelKey: "tableStyleBordered",
    tokens: {
      wrapper: "border border-[var(--border-color)]",
      headerRow: "bg-[var(--surface-thead)]",
      headerCell:
        "border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]",
      bodyRow: "",
      bodyCell: "border border-[var(--border-color)] px-2 py-1.5 text-sm tabular-nums"
    }
  },
  premium: {
    labelKey: "tableStylePremium",
    tokens: {
      wrapper: "border border-[rgba(124,58,237,0.2)] shadow-sm",
      headerRow: "border-b bg-[rgba(124,58,237,0.08)]",
      headerCell: "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--violet-bright)]",
      bodyRow: "border-b border-[var(--border-color)] transition-colors hover:bg-[rgba(124,58,237,0.04)]",
      bodyCell: "px-3 py-2.5 text-sm font-semibold tabular-nums",
      titleBar: "border-b border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.06)] px-3 py-2"
    }
  },
  compact: {
    labelKey: "tableStyleCompact",
    tokens: {
      wrapper: "border border-[var(--border-color)]",
      headerRow: "border-b bg-[var(--surface-thead)]",
      headerCell: "px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]",
      bodyRow: "border-b border-[var(--border-color)] last:border-0",
      bodyCell: "px-2 py-1 text-xs tabular-nums"
    }
  }
};

export function getTableStyleTokens(preset: TableStylePreset | undefined): TableStyleTokens {
  return TABLE_STYLE_PRESETS[preset ?? "striped"].tokens;
}

export function getTableHeaderStyleClasses(headerStyle: TableHeaderStyle | undefined): {
  thead: string;
  headerCell: string;
} {
  switch (headerStyle) {
    case "accent":
      return {
        thead: "bg-[rgba(14,165,233,0.08)]",
        headerCell: "text-[#0ea5e9]"
      };
    case "dark":
      return {
        thead: "bg-[#0f1419] text-white",
        headerCell: "text-white/90"
      };
    default:
      return {
        thead: "",
        headerCell: ""
      };
  }
}

const DENSITY_CELL: Record<TableDensity, string> = {
  compact: "px-2 py-1 text-xs",
  default: "px-3 py-2.5 text-sm",
  comfortable: "px-4 py-3 text-sm"
};

const DENSITY_HEADER: Record<TableDensity, string> = {
  compact: "px-2 py-1 text-[9px]",
  default: "px-3 py-2 text-[10px]",
  comfortable: "px-4 py-2.5 text-xs"
};

const RADIUS_CLASS: Record<TableBorderRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl"
};

const TEXT_ALIGN: Record<TableTextAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
};

export function resolveTablePresentation(config: Partial<TableBlockConfig>) {
  const striping = config.rowStriping ?? "zebra";
  return {
    tokens: getTableStyleTokens(config.tableStyle),
    density: (config.density ?? "default") as TableDensity,
    textAlign: (config.textAlign ?? "left") as TableTextAlign,
    borderRadius: (config.borderRadius ?? "md") as TableBorderRadius,
    stickyHeader: config.stickyHeader !== false,
    showRowBorders: config.showRowBorders !== false,
    headerStyleClasses: getTableHeaderStyleClasses(config.headerStyle),
    rowStriping: striping,
    rowColorOdd: config.rowColorOdd ?? "#ffffff",
    rowColorEven: config.rowColorEven ?? "#f8fafc",
    hoverRowColor: config.hoverRowColor,
    borderColor: config.borderColor,
    headerBgColor: config.headerBgColor,
    headerTextColor: config.headerTextColor
  };
}

export { DENSITY_CELL, DENSITY_HEADER, RADIUS_CLASS, TEXT_ALIGN };
