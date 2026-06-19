"use client";

import { useCallback, useEffect, useState } from "react";

import type { AgencyLearningDto } from "@/lib/agency-brain/agency-learnings-service";
import type { LearningCategory, LearningConfidence, LearningImpact, LearningSource } from "@/lib/agency-brain/types";
import type { LearningSortBy } from "@/components/agency-brain/useAgencyBrain";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useAgencyLearnings(enabled: boolean) {
  const [items, setItems] = useState<AgencyLearningDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [category, setCategory] = useState<LearningCategory | "">("");
  const [impact, setImpact] = useState<LearningImpact | "">("");
  const [source, setSource] = useState<LearningSource | "">("");
  const [confidence, setConfidence] = useState<LearningConfidence | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<LearningSortBy>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(
    async (opts?: { initial?: boolean }) => {
      if (opts?.initial) setLoading(true);
      else setListLoading(true);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (category) params.set("category", category);
        if (impact) params.set("impact", impact);
        if (source) params.set("source", source);
        if (confidence) params.set("confidence", confidence);
        if (tagFilter) params.set("tags", tagFilter);
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/agency-brain/agency-learnings?${params}`);
        const data = await res.json();
        if (data.ok) {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    },
    [debouncedSearch, category, impact, source, confidence, tagFilter, sortBy, sortDir, page]
  );

  useEffect(() => {
    if (!enabled) return;
    void load({ initial: true });
  }, [enabled, load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    listLoading,
    search,
    setSearch,
    category,
    setCategory,
    impact,
    setImpact,
    source,
    setSource,
    confidence,
    setConfidence,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    setPage,
    reload: load
  };
}
