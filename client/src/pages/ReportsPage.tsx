import { useState, useCallback } from "react";
import { api } from "../api";
import AppointmentShuttle from "../components/reports/AppointmentShuttle";
import PdfPreview from "../components/reports/PdfPreview";
import { generateReport } from "../utils/generateReport";
import type { ReportAppointment } from "../utils/generateReport";
import Spinner from "../components/Spinner";

// WHY: Same default as MileagePage. VITE_MILEAGE_RATE is configurable per-deployment.
const DEFAULT_MILEAGE_RATE = parseFloat(import.meta.env.VITE_MILEAGE_RATE || "0.205");

interface ShuttleAppointment {
  id: string;
  title: string | null;
  datetime: string;
  organization: { id: string; name: string; color: string | null } | null;
  patient: { id: string; name: string; color: string | null } | null;
  costItems: { amount: string; type: string }[];
}

export default function ReportsPage() {
  // Report options
  const [includeCharges, setIncludeCharges] = useState(false);
  const [groupByOrganization, setGroupByOrganization] = useState(false);
  const [includeMileage, setIncludeMileage] = useState(false);
  const [mileageRate, setMileageRate] = useState(DEFAULT_MILEAGE_RATE);

  // Shuttle state
  const [included, setIncluded] = useState<ShuttleAppointment[]>([]);

  // PDF state
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (included.length === 0) {
      setError("Select at least one appointment.");
      return;
    }

    setGenerating(true);
    setError(null);
    setPdfData(null);

    try {
      const ids = included.map((a) => a.id);
      const res = await api<{ data: ReportAppointment[] }>("/api/v1/reports/appointments", {
        body: { appointmentIds: ids },
      });

      const pdf = generateReport({
        appointments: res.data,
        includeCharges,
        groupByOrganization,
        includeMileage,
        mileageRate,
      });

      setPdfData(new Uint8Array(pdf));
    } catch {
      setError("Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  }, [included, includeCharges, groupByOrganization, includeMileage, mileageRate]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Reports</h2>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Left panel: options + shuttle */}
        <div className="flex w-96 shrink-0 flex-col gap-4 overflow-y-auto">
          {/* Report options */}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">Report Options</h3>
            <div className="space-y-3">
              <ToggleOption
                label="Include charges/payments"
                checked={includeCharges}
                onChange={setIncludeCharges}
              />
              <ToggleOption
                label="Group by organization"
                checked={groupByOrganization}
                onChange={setGroupByOrganization}
              />
              <ToggleOption
                label="Include mileage"
                checked={includeMileage}
                onChange={setIncludeMileage}
              />
              {includeMileage && (
                <div className="ml-12 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Rate:</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={mileageRate}
                      onChange={(e) => setMileageRate(parseFloat(e.target.value) || 0)}
                      className="w-24 rounded-md border border-gray-700 bg-gray-800 py-1 pl-5 pr-2 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">/mi</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appointment shuttle */}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-300">Select Appointments</h3>
            <AppointmentShuttle
              included={included}
              onIncludedChange={setIncluded}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || included.length === 0}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" /> Generating...
              </span>
            ) : (
              `Generate Report (${included.length} appointments)`
            )}
          </button>

          {error && (
            <div className="rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Right panel: PDF preview */}
        <div className="min-h-0 min-w-0 flex-1">
          <PdfPreview pdfData={pdfData} />
        </div>
      </div>
    </div>
  );
}

function ToggleOption({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-300">
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`h-5 w-9 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-700"}`} />
        <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </div>
      {label}
    </label>
  );
}
