import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { useNavigateAfterSave } from "../hooks/useNavigateAfterSave";
import Spinner from "../components/Spinner";
import { useToast } from "../components/Toast";
import EntityPicker from "../components/EntityPicker";
import MultiEntityPicker from "../components/MultiEntityPicker";
import useHotkeys from "../hooks/useHotkeys";

interface TemplateData {
  name: string;
  organizationId: string | null;
  locationId: string | null;
  activityIds: string[];
  notes: string;
}

interface TemplateResponse {
  id: string;
  name: string;
  organizationId: string | null;
  locationId: string | null;
  notes: string | null;
  appointmentTemplateActivities: { activityId: string }[];
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function TemplateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateTo = useNavigateAfterSave();
  const { toast } = useToast();
  const isNew = !id;

  useHotkeys({
    Escape: () => {
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate("/templates");
    },
  });

  const [form, setForm] = useState<TemplateData>({
    name: "",
    organizationId: null,
    locationId: null,
    activityIds: [],
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      api<TemplateResponse>(`/api/v1/appointment-templates/${id}`)
        .then((template) => {
          setForm({
            name: template.name || "",
            organizationId: template.organizationId,
            locationId: template.locationId,
            activityIds: template.appointmentTemplateActivities.map((ata) => ata.activityId),
            notes: template.notes || "",
          });
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to load template";
          setError(message);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  function update(field: keyof TemplateData, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        name: form.name,
        organizationId: form.organizationId,
        locationId: form.locationId,
        activityIds: form.activityIds,
        notes: form.notes || null,
      };
      if (isNew) {
        await api<TemplateResponse>("/api/v1/appointment-templates", { body });
        toast("Template created", "success");
      } else {
        await api<TemplateResponse>(`/api/v1/appointment-templates/${id}`, { method: "PATCH", body });
        toast("Template updated", "success");
      }
      navigateTo("/templates");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      toast("Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner className="py-12" />;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-100">
        {isNew ? "New Template" : "Edit Template"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm text-gray-400">Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Mon/Wed Chiro Visit"
          />
        </div>

        <EntityPicker
          label="Organization"
          value={form.organizationId}
          onChange={(v) => update("organizationId", v)}
          apiUrl="/api/v1/organizations"
          displayField="name"
        />

        <EntityPicker
          label="Location"
          value={form.locationId}
          onChange={(v) => update("locationId", v)}
          apiUrl="/api/v1/locations"
          displayField="title"
        />

        <MultiEntityPicker
          label="Activities"
          value={form.activityIds}
          onChange={(v) => update("activityIds", v)}
          apiUrl="/api/v1/activities"
          displayField="title"
        />

        <div>
          <label className="mb-1 block text-sm text-gray-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
          </button>
          <Link
            to="/templates"
            className="rounded-md bg-gray-800 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
