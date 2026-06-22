"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListFilter, Settings, Tag, Target } from "lucide-react";

import { CampaignTableColumnsModal } from "@/components/CampaignTableColumnsModal";
import { MetaFilterSearchBar } from "@/components/campaign/MetaFilterSearchBar";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import type { AppliedCampaignFilter } from "@/lib/campaign-meta-filters";
import { useCampaignTableLayout } from "@/hooks/useCampaignTableLayout";

export type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
export type ObjectiveFilter = "ALL" | "leads" | "sales" | "traffic";
export type DisplayStatusFilter = "all" | "active" | "paused" | "draft";

const pillClass =
  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200 whitespace-nowrap";
const pillStyle = {
  color: "var(--text-main)",
  background: "var(--filter-btn-bg)",
  borderColor: "var(--border-color)"
};

export function UxCampaignFiltersPanel({
  filterSearch,
  onFilterSearchChange,
  metaFilters,
  onMetaFiltersChange,
  displayStatusFilter,
  onDisplayStatusFilterChange,
  objectiveFilter,
  onObjectiveFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categoryOptions
}: {
  filterSearch: string;
  onFilterSearchChange: (v: string) => void;
  metaFilters: AppliedCampaignFilter[];
  onMetaFiltersChange: (v: AppliedCampaignFilter[]) => void;
  displayStatusFilter: DisplayStatusFilter;
  onDisplayStatusFilterChange: (v: DisplayStatusFilter) => void;
  objectiveFilter: ObjectiveFilter;
  onObjectiveFilterChange: (v: ObjectiveFilter) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;
  categoryOptions?: Array<{ value: string; label: string }>;
}) {
  const t = useTranslations("campaignsPage");
  const tableLayout = useCampaignTableLayout();
  const [columnsOpen, setColumnsOpen] = useState(false);

  const displayStatusOptions = [
    { value: "active", label: "Ativas" },
    { value: "paused", label: "Pausadas" },
    { value: "draft", label: "Rascunho" }
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <MetaFilterSearchBar
          value={filterSearch}
          onChange={onFilterSearchChange}
          filters={metaFilters}
          onFiltersChange={onMetaFiltersChange}
          variant="filterPill"
        />

        <FilterSelectDropdown
          icon={<ListFilter size={14} />}
          label="Status"
          placeholder="Todas"
          value={displayStatusFilter === "all" ? "" : displayStatusFilter}
          onChange={(v) => onDisplayStatusFilterChange((v || "all") as DisplayStatusFilter)}
          options={displayStatusOptions}
        />

        <FilterSelectDropdown
          icon={<Target size={14} />}
          label={t("filterObjective")}
          placeholder={t("objectiveAll")}
          value={objectiveFilter === "ALL" ? "" : objectiveFilter}
          onChange={(v) => onObjectiveFilterChange((v || "ALL") as ObjectiveFilter)}
          options={[
            { value: "leads", label: t("objectiveLeads") },
            { value: "sales", label: t("objectiveSales") },
            { value: "traffic", label: t("objectiveTraffic") }
          ]}
        />

        {categoryOptions?.length && onCategoryFilterChange ? (
          <FilterSelectDropdown
            icon={<Tag size={14} />}
            label="Categoria"
            placeholder="Categoria"
            value={categoryFilter ?? ""}
            onChange={onCategoryFilterChange}
            options={categoryOptions}
          />
        ) : null}

        <button
          type="button"
          onClick={() => setColumnsOpen(true)}
          className={`${pillClass} text-xs font-heading font-semibold`}
          style={{ ...pillStyle, color: "var(--text-dim)" }}
        >
          <Settings size={13} />
          {t("columnsTitle")}
        </button>
      </div>

      <CampaignTableColumnsModal
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        layout={tableLayout}
      />
    </>
  );
}
