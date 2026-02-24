import { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { api } from "../api";
import { useNavigateAfterSave } from "../hooks/useNavigateAfterSave";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import ColorPicker from "../components/ColorPicker";
import MultiEntityPicker from "../components/MultiEntityPicker";
import useHotkeys from "../hooks/useHotkeys";

interface OrganizationData {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  color: string | null;
  organizationLocations: { locationId: string }[];
  organizationPersons: { personId: string }[];
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function OrganizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateTo = useNavigateAfterSave();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const isNew = !id;

  if (!canEdit("organizations")) return <Navigate to="/organizations" replace />;

  useHotkeys({
    Escape: () => {
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate("/organizations");
    },
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    api<OrganizationData>(`/api/v1/organizations/${id}`)
      .then((data) => {
        setName(data.name);
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setNotes(data.notes ?? "");
        setColor(data.color);
        setLocationIds(
          data.organizationLocations?.map((l) => l.locationId) ?? [],
        );
        setPersonIds(
          data.organizationPersons?.map((p) => p.personId) ?? [],
        );
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load organization",
        );
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const body = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
      color,
      locationIds,
      personIds,
    };

    try {
      if (isNew) {
        await api("/api/v1/organizations", { method: "POST", body });
        toast("Organization created", "success");
      } else {
        await api(`/api/v1/organizations/${id}`, { method: "PATCH", body });
        toast("Organization updated", "success");
      }
      navigateTo("/organizations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      toast("Failed to save organization", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-100">
        {isNew ? "New Organization" : "Edit Organization"}
      </h2>

      {error && (
        <div className="mb-4 rounded border border-red-600/50 bg-red-600/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">Color</span>
          <ColorPicker
            value={color ?? "#6b7280"}
            onChange={(c) => setColor(c)}
          />
          {color && (
            <button
              type="button"
              onClick={() => setColor(null)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>

        <MultiEntityPicker
          label="Locations"
          value={locationIds}
          onChange={setLocationIds}
          apiUrl="/api/v1/locations"
          displayField="title"
        />

        <MultiEntityPicker
          label="Providers / People"
          value={personIds}
          onChange={setPersonIds}
          apiUrl="/api/v1/persons"
          displayField="name"
        />

        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create" : "Update"}
          </button>
          <Link
            to="/organizations"
            className="rounded bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
