import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { PaginatedResponse } from "../types";
import EntityPicker from "./EntityPicker";
import RecurrenceSelector from "./RecurrenceSelector";
import Spinner from "./Spinner";
import { useToast } from "./Toast";
import { normalizeDateValue } from "../utils/dateInput";
import { defaultRecurrenceRule, generateRecurrenceDates, MAX_OCCURRENCES } from "../utils/recurrence";
import type { RecurrenceRule } from "../utils/recurrence";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface AppointmentTemplate {
  id: string;
  name: string;
  organizationId: string | null;
  locationId: string | null;
  notes: string | null;
  organization: { id: string; name: string } | null;
  location: { id: string; title: string } | null;
  appointmentTemplateActivities: { activityId: string; activity: { id: string; title: string } }[];
}

export default function TemplateQuickAdd({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AppointmentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [patientPersonId, setPatientPersonId] = useState<string | null>(null);
  const [datetime, setDatetime] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(defaultRecurrenceRule);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    api<PaginatedResponse<AppointmentTemplate>>("/api/v1/appointment-templates?limit=100")
      .then((res) => setTemplates(res.data))
      .catch(() => setError("Failed to load templates"))
      .finally(() => setLoading(false));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;

  // Generate dates for preview
  const occurrenceDates = recurrence.preset !== "none"
    ? generateRecurrenceDates(new Date(datetime).toISOString(), recurrence)
    : [];
  const occurrenceCount = occurrenceDates.length;
  const isRecurring = recurrence.preset !== "none" && occurrenceCount > 1;
  const hitsMax = occurrenceCount >= MAX_OCCURRENCES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;

    setSaving(true);
    setError("");

    if (!isRecurring) {
      // Single appointment -- existing behavior
      try {
        const body = {
          title: null,
          datetime: new Date(datetime).toISOString(),
          notes: selectedTemplate.notes || null,
          organizationId: selectedTemplate.organizationId,
          locationId: selectedTemplate.locationId,
          patientPersonId,
          providerIds: [],
          activityIds: selectedTemplate.appointmentTemplateActivities.map((ata) => ata.activityId),
          drivingDistanceRoundTrip: true,
        };
        const created = await api<{ id: string }>("/api/v1/appointments", { body });
        toast("Appointment created from template", "success");
        navigate(`/appointments/${created.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create appointment";
        setError(message);
        setSaving(false);
      }
      return;
    }

    // Recurring -- sequential POSTs with progress
    const dates = occurrenceDates;
    let succeeded = 0;
    let failed = 0;

    setProgress({ current: 0, total: dates.length });

    for (let i = 0; i < dates.length; i++) {
      setProgress({ current: i + 1, total: dates.length });
      try {
        const body = {
          title: null,
          datetime: dates[i],
          notes: selectedTemplate.notes || null,
          organizationId: selectedTemplate.organizationId,
          locationId: selectedTemplate.locationId,
          patientPersonId,
          providerIds: [],
          activityIds: selectedTemplate.appointmentTemplateActivities.map((ata) => ata.activityId),
          drivingDistanceRoundTrip: true,
        };
        await api<{ id: string }>("/api/v1/appointments", { body });
        succeeded++;
      } catch {
        failed++;
      }
    }

    setProgress(null);
    setSaving(false);

    if (failed === 0) {
      toast(`Created ${succeeded} appointments from template`, "success");
    } else if (succeeded === 0) {
      toast(`Failed to create all ${failed} appointments`, "error");
    } else {
      toast(`Created ${succeeded} of ${succeeded + failed} appointments (${failed} failed)`, "error");
    }

    onClose();
    onCreated?.();
  }

  const modalRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Tab" && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === "Escape" && !saving) {
      e.preventDefault();
      onClose();
    }
  }

  function handleBackdropClick() {
    if (!saving) onClose();
  }

  function handleCloseClick() {
    if (!saving) onClose();
  }

  // Derive the start date (YYYY-MM-DD) for the recurrence selector from datetime
  const startDate = datetime.slice(0, 10);

  const submitLabel = isRecurring
    ? saving
      ? progress
        ? `Creating ${progress.current} of ${progress.total}...`
        : "Creating..."
      : `Create ${occurrenceCount} Appointments`
    : saving
      ? "Creating..."
      : "Create Appointment";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">Create from Template</h3>
          <button onClick={handleCloseClick} className="text-gray-400 hover:text-gray-200" disabled={saving}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-900/30 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <Spinner className="py-8" />
        ) : templates.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No templates found. Create one first.</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-400">Template *</label>
              <select
                required
                autoFocus
                value={selectedTemplateId || ""}
                onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <div className="rounded border border-gray-700 bg-gray-800/50 px-3 py-2 text-sm text-gray-400">
                {selectedTemplate.organization?.name && (
                  <div>Org: {selectedTemplate.organization.name}</div>
                )}
                {selectedTemplate.location?.title && (
                  <div>Location: {selectedTemplate.location.title}</div>
                )}
                {selectedTemplate.appointmentTemplateActivities.length > 0 && (
                  <div>
                    Activities:{" "}
                    {selectedTemplate.appointmentTemplateActivities.map((ata) => ata.activity.title).join(", ")}
                  </div>
                )}
              </div>
            )}

            <EntityPicker
              label="Patient"
              value={patientPersonId}
              onChange={(v) => setPatientPersonId(v)}
              apiUrl="/api/v1/persons"
              displayField="name"
              colorField="color"
              queryParams={{ isPatient: "true" }}
            />

            <div>
              <label className="mb-1 block text-sm text-gray-400">Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
                onBlur={(e) => setDatetime(normalizeDateValue(e.target.value))}
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-gray-100 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <RecurrenceSelector
              startDate={startDate}
              value={recurrence}
              onChange={setRecurrence}
            />

            {isRecurring && (
              <div className="text-sm text-gray-400">
                Will create {occurrenceCount} appointments{hitsMax ? " (maximum)" : ""}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || !selectedTemplateId}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLabel}
              </button>
              <button
                type="button"
                onClick={handleCloseClick}
                disabled={saving}
                className="rounded-md bg-gray-800 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
