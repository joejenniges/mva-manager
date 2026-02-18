import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";

interface AddressResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: string;
  lng: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: AddressResult) => void;
}

interface MapboxSuggestion {
  mapbox_id: string;
  name: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    place?: { name: string };
    region?: { name: string; region_code: string };
    postcode?: { name: string };
  };
}

interface MapboxFeature {
  properties: {
    name: string;
    full_address?: string;
    context?: {
      address?: { street_name: string; address_number: string };
      place?: { name: string };
      region?: { name: string; region_code: string };
      postcode?: { name: string };
    };
  };
  geometry: {
    coordinates: [number, number];
  };
}

function formatSuggestion(s: MapboxSuggestion): string {
  return s.full_address || s.place_formatted || s.name;
}

// WHY: Generate a session token per component mount for Mapbox billing.
// Mapbox groups suggest+retrieve calls by session_token so we're billed
// per session (cheaper) rather than per request.
function generateSessionToken(): string {
  return crypto.randomUUID();
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sessionTokenRef = useRef(generateSessionToken());

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        session_token: sessionTokenRef.current,
      });
      const data = await api<{ suggestions: MapboxSuggestion[] }>(
        `/api/v1/geocode/suggest?${params}`,
      );
      setSuggestions(data.suggestions || []);
      setOpen((data.suggestions || []).length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSelect(suggestion: MapboxSuggestion) {
    setOpen(false);
    setSuggestions([]);
    onChange(formatSuggestion(suggestion));

    try {
      const params = new URLSearchParams({
        session_token: sessionTokenRef.current,
      });
      const data = await api<{ features: MapboxFeature[] }>(
        `/api/v1/geocode/retrieve/${encodeURIComponent(suggestion.mapbox_id)}?${params}`,
      );

      // Start a new session after retrieve completes a session
      sessionTokenRef.current = generateSessionToken();

      const feature = data.features?.[0];
      if (!feature) return;

      const ctx = feature.properties.context;
      const addrCtx = ctx?.address;
      const streetAddr = addrCtx
        ? [addrCtx.address_number, addrCtx.street_name].filter(Boolean).join(" ")
        : feature.properties.name;

      onSelect({
        address: streetAddr,
        city: ctx?.place?.name ?? "",
        state: ctx?.region?.region_code ?? "",
        zip: ctx?.postcode?.name ?? "",
        lat: String(feature.geometry.coordinates[1]),
        lng: String(feature.geometry.coordinates[0]),
      });
    } catch {
      // Suggest already filled the display value; retrieve failure is non-fatal
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded border border-gray-700 bg-gray-800 shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            )}
            {suggestions.map((s) => (
              <button
                type="button"
                key={s.mapbox_id}
                onClick={() => handleSelect(s)}
                className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-700"
              >
                {formatSuggestion(s)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
