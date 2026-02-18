import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";
import type { PaginatedResponse } from "../types";

interface MultiEntityPickerProps {
  label: string;
  value: string[];
  onChange: (ids: string[]) => void;
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

export default function MultiEntityPicker({
  label,
  value,
  onChange,
  apiUrl,
  displayField = "title",
  colorField,
  queryParams,
}: MultiEntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Entity[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // WHY: Use a ref for selectedEntities lookups inside the effect below.
  // The effect needs to read current selectedEntities to avoid re-fetching
  // already-resolved entities, but putting selectedEntities in the dependency
  // array creates an infinite loop (effect sets selectedEntities -> triggers
  // effect -> sets selectedEntities -> ...).
  const selectedEntitiesRef = useRef<Entity[]>([]);
  selectedEntitiesRef.current = selectedEntities;

  // Resolve selected entity labels - fetch individually on mount if needed
  useEffect(() => {
    if (value.length === 0) {
      setSelectedEntities((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const currentSelected = selectedEntitiesRef.current;
    const resolved: Entity[] = [];
    const unresolved: string[] = [];
    for (const id of value) {
      const found =
        options.find((o) => o.id === id) ??
        currentSelected.find((e) => e.id === id);
      if (found) {
        resolved.push(found);
      } else {
        unresolved.push(id);
      }
    }

    if (unresolved.length === 0) {
      setSelectedEntities(resolved);
      return;
    }

    // Fetch unresolved entities individually
    Promise.all(
      unresolved.map((id) =>
        api<Entity>(`${apiUrl}/${id}`).catch(() => null),
      ),
    ).then((results) => {
      const fetched = results.filter((r): r is Entity => r !== null);
      setSelectedEntities([...resolved, ...fetched]);
    });
  }, [value, apiUrl, options]);

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

  function addItem(id: string) {
    if (!value.includes(id)) {
      const entity = options.find((o) => o.id === id);
      if (entity) {
        setSelectedEntities((prev) => [...prev, entity]);
      }
      onChange([...value, id]);
    }
  }

  function removeItem(id: string) {
    onChange(value.filter((v) => v !== id));
    setSelectedEntities((prev) => prev.filter((e) => e.id !== id));
  }

  const availableOptions = options.filter((o) => !value.includes(o.id));

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
    if (highlightIndex < 0 || highlightIndex >= availableOptions.length) return;
    addItem(availableOptions[highlightIndex].id);
    setSearch("");
    setHighlightIndex(-1);
    // Keep dropdown open for multi-select
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
      setHighlightIndex((i) => Math.min(i + 1, availableOptions.length - 1));
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

      {/* Selected chips */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {selectedEntities.map((entity) => (
          <span
            key={entity.id}
            className="inline-flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-gray-200"
          >
            {getColor(entity) && <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: getColor(entity)! }} />}
            {getDisplayValue(entity)}
            <button
              type="button"
              onClick={() => removeItem(entity.id)}
              className="text-gray-400 hover:text-gray-200"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? closeDropdown() : openDropdown()}
        onKeyDown={handleTriggerKeyDown}
        className="rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200"
      >
        + Add
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
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                Loading...
              </div>
            ) : availableOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                {options.length === 0 ? "No results" : "All items selected"}
              </div>
            ) : (
              availableOptions.map((option, i) => (
                <button
                  type="button"
                  key={option.id}
                  data-index={i}
                  onClick={() => {
                    addItem(option.id);
                    setSearch("");
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 ${
                    highlightIndex === i ? "bg-gray-700 text-blue-400" : "text-gray-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {getColor(option) && <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: getColor(option)! }} />}
                    {getDisplayValue(option)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
