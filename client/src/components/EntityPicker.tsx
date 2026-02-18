import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import type { PaginatedResponse } from "../types";

interface EntityPickerProps {
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
  apiUrl: string;
  displayField?: string;
  /** Field name containing a CSS color string (e.g. "color") */
  colorField?: string;
  /** Extra query params appended to every fetch (e.g. { isPatient: "true" }) */
  queryParams?: Record<string, string>;
}

interface Entity {
  id: string;
  [key: string]: unknown;
}

export default function EntityPicker({
  label,
  value,
  onChange,
  apiUrl,
  displayField = "title",
  colorField,
  queryParams,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch options on open or search change
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (queryParams) {
        for (const [k, v] of Object.entries(queryParams)) params.set(k, v);
      }
      const result = await api<PaginatedResponse<Entity>>(
        `${apiUrl}?${params.toString()}`,
      );
      setOptions(result.data);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, search, queryParams]);

  useEffect(() => {
    if (open) {
      fetchOptions();
    }
  }, [open, fetchOptions]);

  // Resolve selected value label + color
  useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      setSelectedColor(null);
      return;
    }
    // Check if it's already in options
    const found = options.find((o) => o.id === value);
    if (found) {
      const display = (found[displayField] ?? found.name ?? found.title ?? "") as string;
      setSelectedLabel(display);
      setSelectedColor(colorField ? (found[colorField] as string | null) : null);
      return;
    }
    // Fetch single entity
    api<Entity>(`${apiUrl}/${value}`)
      .then((entity) => {
        const display = (entity[displayField] ?? entity.name ?? entity.title ?? "") as string;
        setSelectedLabel(display);
        setSelectedColor(colorField ? (entity[colorField] as string | null) : null);
      })
      .catch(() => {
        setSelectedLabel("(unknown)");
        setSelectedColor(null);
      });
  }, [value, options, apiUrl, displayField, colorField]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function getDisplayValue(entity: Entity): string {
    return (entity[displayField] ?? entity.name ?? entity.title ?? "") as string;
  }

  function getColor(entity: Entity): string | null {
    return colorField ? (entity[colorField] as string | null) : null;
  }

  // Build flat selectable items list: "Clear selection" (if value set) + options
  const selectableItems: { type: "clear" | "option"; entity?: Entity }[] = [];
  if (value) selectableItems.push({ type: "clear" });
  if (!loading) {
    for (const o of options) {
      selectableItems.push({ type: "option", entity: o });
    }
  }

  function openDropdown(initialSearch = "") {
    setSearch(initialSearch);
    setHighlightIndex(-1);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setSearch("");
    setHighlightIndex(-1);
    triggerRef.current?.focus();
  }

  function selectHighlighted() {
    if (highlightIndex < 0 || highlightIndex >= selectableItems.length) return;
    const item = selectableItems[highlightIndex];
    if (item.type === "clear") {
      onChange(null);
    } else if (item.entity) {
      onChange(item.entity.id);
    }
    setOpen(false);
    setSearch("");
    setHighlightIndex(-1);
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  // Reset highlight on search change
  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openDropdown();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      openDropdown(e.key);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, selectableItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectHighlighted();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "Tab") {
      setOpen(false);
      setSearch("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-gray-300">
        {label}
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? closeDropdown() : openDropdown()}
        onKeyDown={handleTriggerKeyDown}
        className="flex w-full items-center justify-between rounded border border-gray-700 bg-gray-800 px-3 py-2 text-left text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
      >
        <span className={`inline-flex items-center gap-1.5 ${value ? "text-gray-100" : "text-gray-500"}`}>
          {value && selectedColor && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: selectedColor }} />}
          {value ? selectedLabel || "Loading..." : "Select..."}
        </span>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded border border-gray-700 bg-gray-800 shadow-lg">
          <div className="border-b border-gray-700 p-2">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search..."
              className="w-full rounded border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </div>
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {value && (
              <button
                type="button"
                data-index={0}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-700 ${
                  highlightIndex === 0 ? "bg-gray-700" : ""
                }`}
              >
                Clear selection
              </button>
            )}
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : options.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No results
              </div>
            ) : (
              options.map((option, i) => {
                const idx = value ? i + 1 : i;
                return (
                  <button
                    type="button"
                    key={option.id}
                    data-index={idx}
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 ${
                      highlightIndex === idx
                        ? "bg-gray-700 text-blue-400"
                        : option.id === value
                          ? "bg-gray-700 text-blue-400"
                          : "text-gray-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {getColor(option) && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: getColor(option)! }} />}
                      {getDisplayValue(option)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
