import { useState, type ReactNode, type RefObject } from "react";
import Spinner from "./Spinner";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
}

interface EntityTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onDelete?: (id: string) => void;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  header?: ReactNode;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  selectedIndex?: number;
}

export default function EntityTable<T extends { id: string }>({
  columns,
  data,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onSearch,
  onDelete,
  searchPlaceholder = "Search...",
  onRowClick,
  header,
  searchInputRef,
  selectedIndex,
}: EntityTableProps<T>) {
  const [searchValue, setSearchValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function handleSearch(value: string) {
    setSearchValue(value);
    onSearch(value);
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      onDelete?.(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  }

  function getValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900">
      {/* Search bar + optional header */}
      <div className="flex items-center gap-3 border-b border-gray-700 px-4 py-3">
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
        {header}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-400${col.hideOnMobile ? " hidden md:table-cell" : ""}`}
                >
                  {col.label}
                </th>
              ))}
              {onDelete && (
                <th className="w-20 px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onDelete ? 1 : 0)}
                  className="px-4 py-8"
                >
                  <Spinner className="py-4" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onDelete ? 1 : 0)}>
                  <EmptyState
                    title={searchValue ? "No results found" : "Nothing here yet"}
                    description={searchValue ? "Try a different search term." : undefined}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                  <tr
                    key={row.id}
                    data-row-index={i}
                    className={`border-b border-gray-700/50 ${
                      onRowClick
                        ? "cursor-pointer hover:bg-gray-800/50"
                        : ""
                    } ${selectedIndex === i ? "bg-blue-900/20 outline outline-1 outline-blue-500/50" : ""}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-2.5 text-gray-300${col.hideOnMobile ? " hidden md:table-cell" : ""}`}
                      >
                        {col.render
                          ? col.render(row)
                          : String(getValue(row, col.key) ?? "")}
                      </td>
                    ))}
                    {onDelete && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.id);
                          }}
                          onBlur={() => setConfirmDeleteId(null)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          {confirmDeleteId === row.id ? "Confirm?" : "Delete"}
                        </button>
                      </td>
                    )}
                  </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
        <span className="text-xs text-gray-500">
          {total} total result{total !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
          >
            Prev
          </button>
          <span className="text-xs text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
