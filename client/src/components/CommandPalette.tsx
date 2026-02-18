import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const DESTINATIONS = [
  { label: "Dashboard", path: "/" },
  { label: "Events", path: "/events" },
  { label: "Appointments", path: "/appointments" },
  { label: "Persons", path: "/persons" },
  { label: "Organizations", path: "/organizations" },
  { label: "Locations", path: "/locations" },
  { label: "Documents", path: "/documents" },
  { label: "Activities", path: "/activities" },
  { label: "Person Roles", path: "/person-roles" },
  { label: "Doc Types", path: "/document-types" },
  { label: "Mileage", path: "/mileage" },
  { label: "Calendar", path: "/calendar" },
  { label: "Templates", path: "/templates" },
  { label: "New Event", path: "/events/new" },
  { label: "New Appointment", path: "/appointments/new" },
  { label: "New Person", path: "/persons/new" },
  { label: "New Organization", path: "/organizations/new" },
  { label: "New Location", path: "/locations/new" },
  { label: "New Template", path: "/templates/new" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const filtered = search
    ? DESTINATIONS.filter((d) =>
        d.label.toLowerCase().includes(search.toLowerCase())
      )
    : DESTINATIONS;

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setSearch("");
      setHighlightIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Clamp highlight when filtered list shrinks
  useEffect(() => {
    setHighlightIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open) return;
    const el = document.querySelector(`[data-palette-index="${highlightIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  function go(index: number) {
    const dest = filtered[index];
    if (!dest) return;
    navigate(dest.path);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(highlightIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-700 px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Go to page..."
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
          ) : (
            filtered.map((dest, i) => (
              <button
                key={dest.path}
                data-palette-index={i}
                onClick={() => go(i)}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`flex w-full items-center px-4 py-2 text-left text-sm ${
                  highlightIndex === i
                    ? "bg-blue-600/20 text-blue-300"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {dest.label}
                <span className="ml-auto text-xs text-gray-600">
                  {dest.path}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
