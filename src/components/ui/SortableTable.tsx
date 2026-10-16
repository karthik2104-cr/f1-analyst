"use client";

import { useMemo, useState } from "react";

export type Column<T> = {
  id: string;
  header: string;
  align?: "left" | "right";
  sortValue?: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
};

export function SortableTable<T>({
  rows,
  columns,
  caption,
  initialSort,
  getKey,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  initialSort?: { id: string; direction: "asc" | "desc" };
  getKey: (row: T) => string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = column.sortValue?.(a) ?? null;
      const bv = column.sortValue?.(b) ?? null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const compared = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.direction === "asc" ? compared : -compared;
    });
  }, [rows, columns, sort]);

  return (
    <div className="table-wrap">
      <table className="data">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id ? sort.direction : null;
              return (
                <th key={column.id} scope="col" aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"} className={column.align === "right" ? "num" : undefined}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      className="sort"
                      onClick={() =>
                        setSort((current) => {
                          if (!current || current.id !== column.id) return { id: column.id, direction: "asc" };
                          if (current.direction === "asc") return { id: column.id, direction: "desc" };
                          return null;
                        })
                      }
                    >
                      {column.header}
                      {active === "asc" ? " ↑" : active === "desc" ? " ↓" : ""}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No rows match.</td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr key={getKey(row)}>
                {columns.map((column) => (
                  <td key={column.id} className={column.align === "right" ? "num" : undefined}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
