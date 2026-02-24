import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { api } from "../api";
import { useNavigateAfterSave } from "../hooks/useNavigateAfterSave";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import AddressAutocomplete from "../components/AddressAutocomplete";
import useHotkeys from "../hooks/useHotkeys";

interface LocationData {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: string | null;
  lng: string | null;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function LocationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateTo = useNavigateAfterSave();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const isNew = !id;

  if (!canEdit("locations")) return <Navigate to="/locations" replace />;

  useHotkeys({
    Escape: () => {
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate("/locations");
    },
  });

  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [lat, setLat] = useState<string | null>(null);
  const [lng, setLng] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api<LocationData>(`/api/v1/locations/${id}`)
      .then((data) => {
        setTitle(data.title);
        setAddress(data.address ?? "");
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setZip(data.zip ?? "");
        setLat(data.lat);
        setLng(data.lng);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load location");
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      title: title.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      lat: address.trim() ? lat : null,
      lng: address.trim() ? lng : null,
    };

    try {
      if (isNew) {
        await api("/api/v1/locations", { method: "POST", body });
        toast("Location created", "success");
      } else {
        await api(`/api/v1/locations/${id}`, { method: "PATCH", body });
        toast("Location updated", "success");
      }
      navigateTo("/locations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      toast("Failed to save location", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-100">
        {isNew ? "New Location" : "Edit Location"}
      </h2>

      {error && (
        <div className="mb-4 rounded border border-red-600/50 bg-red-600/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Address
          </label>
          <AddressAutocomplete
            value={address}
            onChange={(val) => {
              setAddress(val);
              // Clear lat/lng when user manually types (backend will re-geocode)
              setLat(null);
              setLng(null);
            }}
            onSelect={(result) => {
              setAddress(result.address);
              setCity(result.city);
              setState(result.state);
              setZip(result.zip);
              setLat(result.lat);
              setLng(result.lng);
            }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Zip
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create" : "Update"}
          </button>
          <Link
            to="/locations"
            className="rounded bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
