import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Navigate, Link } from "react-router-dom";
import { api } from "../api";
import { useNavigateAfterSave } from "../hooks/useNavigateAfterSave";
import { useToast } from "../components/Toast";
import { usePermissions } from "../permissions";
import { normalizeDateValue } from "../utils/dateInput";
import EntityPicker from "../components/EntityPicker";
import MultiEntityPicker from "../components/MultiEntityPicker";
import useHotkeys from "../hooks/useHotkeys";

interface AppointmentData {
  title: string;
  datetime: string;
  notes: string;
  organizationId: string | null;
  locationId: string | null;
  patientPersonId: string | null;
  providerIds: string[];
  activityIds: string[];
  drivingDistanceRoundTrip: boolean;
}

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function AppointmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const navigateTo = useNavigateAfterSave();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const [searchParams] = useSearchParams();
  const isNew = !id;

  if (!canEdit("appointments")) return <Navigate to="/appointments" replace />;

  useHotkeys({
    Escape: () => {
      const active = document.activeElement as HTMLElement;
      if (active && INPUT_TAGS.has(active.tagName)) active.blur();
      else navigate(id ? `/appointments/${id}` : "/appointments", { replace: !!id });
    },
  });

  // WHY: datetime-local inputs use local time, not UTC. toISOString() returns
  // UTC which causes the displayed time to shift by the timezone offset.
  // Instead, format using local date/time components.
  function toLocalDatetimeString(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // WHY: Calendar click-to-create passes ?datetime=ISO to pre-fill the date
  const initialDatetime = searchParams.get("datetime")
    ? toLocalDatetimeString(new Date(searchParams.get("datetime")!))
    : toLocalDatetimeString(new Date());

  const [form, setForm] = useState<AppointmentData>({
    title: "",
    datetime: initialDatetime,
    notes: "",
    organizationId: null,
    locationId: null,
    patientPersonId: null,
    providerIds: [],
    activityIds: [],
    drivingDistanceRoundTrip: true,
  });
  const [orgLocations, setOrgLocations] = useState<{ id: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      api<any>(`/api/v1/appointments/${id}`).then((appt) => {
        setForm({
          title: appt.title || "",
          datetime: appt.datetime ? toLocalDatetimeString(new Date(appt.datetime)) : "",
          notes: appt.notes || "",
          organizationId: appt.organizationId,
          locationId: appt.locationId,
          patientPersonId: appt.patientPersonId,
          providerIds: appt.appointmentProviders?.map((ap: any) => ap.personId) || [],
          activityIds: appt.appointmentActivities?.map((aa: any) => aa.activityId) || [],
          drivingDistanceRoundTrip: appt.drivingDistanceRoundTrip ?? true,
        });
      });
    }
  }, [id]);

  // Fetch locations for selected organization
  useEffect(() => {
    if (form.organizationId) {
      api<any>(`/api/v1/organizations/${form.organizationId}`).then((org) => {
        const locs = org.organizationLocations?.map((ol: any) => ol.location) || [];
        setOrgLocations(locs);
        // Auto-select first location if only one and no location set
        if (locs.length === 1 && !form.locationId) {
          setForm((f) => ({ ...f, locationId: locs[0].id }));
        }
      }).catch(() => setOrgLocations([]));
    } else {
      setOrgLocations([]);
    }
  }, [form.organizationId]);

  function update(field: keyof AppointmentData, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        title: form.title || null,
        notes: form.notes || null,
        datetime: new Date(form.datetime).toISOString(),
      };
      if (isNew) {
        const created = await api<any>("/api/v1/appointments", { body });
        toast("Appointment created", "success");
        navigateTo(`/appointments/${created.id}`);
      } else {
        await api<any>(`/api/v1/appointments/${id}`, { method: "PATCH", body });
        toast("Appointment updated", "success");
        navigateTo(`/appointments/${id}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
      toast("Failed to save appointment", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-semibold text-gray-100">{isNew ? "New Appointment" : "Edit Appointment"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">{error}</div>}

        <div>
          <label className="mb-1 block text-sm text-gray-400">Title (auto-generated if blank)</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            autoFocus
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-400">Date & Time *</label>
          <input
            type="datetime-local"
            required
            value={form.datetime}
            onChange={(e) => update("datetime", e.target.value)}
            onBlur={(e) => update("datetime", normalizeDateValue(e.target.value))}
            onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
            className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <EntityPicker
          label="Organization"
          value={form.organizationId}
          onChange={(v) => { update("organizationId", v); update("locationId", null); }}
          apiUrl="/api/v1/organizations"
          displayField="name"
          colorField="color"
        />

        {form.organizationId && orgLocations.length > 0 && (
          <div>
            <label className="mb-1 block text-sm text-gray-400">Location</label>
            <select
              value={form.locationId || ""}
              onChange={(e) => update("locationId", e.target.value || null)}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select location...</option>
              {orgLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.title}</option>
              ))}
            </select>
          </div>
        )}

        {!form.organizationId && (
          <EntityPicker
            label="Location"
            value={form.locationId}
            onChange={(v) => update("locationId", v)}
            apiUrl="/api/v1/locations"
            displayField="title"
          />
        )}

        <EntityPicker
          label="Patient"
          value={form.patientPersonId}
          onChange={(v) => update("patientPersonId", v)}
          apiUrl="/api/v1/persons"
          displayField="name"
          colorField="color"
          queryParams={{ isPatient: "true" }}
        />

        <MultiEntityPicker
          label="Providers"
          value={form.providerIds}
          onChange={(v) => update("providerIds", v)}
          apiUrl="/api/v1/persons"
          displayField="name"
          colorField="color"
          queryParams={{ isPatient: "false" }}
        />

        <MultiEntityPicker
          label="Activities"
          value={form.activityIds}
          onChange={(v) => update("activityIds", v)}
          apiUrl="/api/v1/activities"
          displayField="title"
          colorField="color"
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="roundTrip"
            checked={form.drivingDistanceRoundTrip}
            onChange={(e) => update("drivingDistanceRoundTrip", e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="roundTrip" className="text-sm text-gray-400">Round trip mileage</label>
        </div>

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
            {saving ? "Saving..." : isNew ? "Create Appointment" : "Save Changes"}
          </button>
          <Link
            to={id ? `/appointments/${id}` : "/appointments"}
            className="rounded-md bg-gray-800 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
