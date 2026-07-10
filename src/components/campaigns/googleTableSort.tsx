"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/cn";

export type SortDir = "asc" | "desc";

/**
 * Ordenação client-side simples para as tabelas Google (número ou string).
 * Espelha o comportamento das tabelas Meta (clicar no cabeçalho ordena asc/desc).
 */
export function useTableSort<T extends Record<string, unknown>>(
  rows: T[],
  defaultKey: keyof T & string,
  defaultDir: SortDir = "desc"
) {
  const [sortKey, setSortKey] = useState<string>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  function toggle(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return { sorted, sortKey, sortDir, toggle };
}

/** Cabeçalho de coluna clicável com indicador de ordenação. */
export function SortableTh({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = "left",
  className
}: {
  label: string;
  sortKey: string;
  activeKey: string;
  dir: SortDir;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortKey === activeKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={cn(
        "cursor-pointer select-none py-2 pr-3 transition-colors hover:text-[var(--text-main)]",
        align === "right" && "text-right",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1",
          align === "right" && "flex-row-reverse"
        )}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp size={12} className="shrink-0" />
          ) : (
            <ChevronDown size={12} className="shrink-0" />
          )
        ) : null}
      </span>
    </th>
  );
}
