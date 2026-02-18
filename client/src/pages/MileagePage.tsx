import { useState, useEffect } from "react";
import { api } from "../api";
import type { PaginatedResponse } from "../types";
import Spinner from "../components/Spinner";
import useHotkeys from "../hooks/useHotkeys";

interface FilterOption {
  id: string;
  name: string;
}

interface PatientMileage {
  patientId: string | null;
  patientName: string;
  patientColor: string | null;
  appointmentCount: number;
  totalMiles: number;
  roundTripMiles: number;
}

interface MileageResponse {
  patients: PatientMileage[];
  totals: {
    appointmentCount: number;
    totalMiles: number;
    roundTripMiles: number;
  };
  tripTotals: {
    tripCount: number;
    totalMiles: number;
    roundTripMiles: number;
  };
}

export default function MileagePage() {
  const [data, setData] = useState<MileageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState("");
  const [patients, setPatients] = useState<FilterOption[]>([]);

  useHotkeys({
    Escape: () => (document.activeElement as HTMLElement)?.blur(),
  });

  useEffect(() => {
    api<PaginatedResponse<{ id: string; name: string }>>("/api/v1/persons?isPatient=true&limit=100")
      .then((res) => setPatients(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (patientId) params.set("patientId", patientId);
    api<MileageResponse>(`/api/v1/mileage?${params}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Mileage</h2>
      </div>

      <div className="mb-4">
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner className="py-8" />
      ) : !data || data.patients.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No mileage data found.</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Patient</th>
                <th className="px-4 py-3 text-right font-medium">Appointments</th>
                <th className="px-4 py-3 text-right font-medium">One-Way Miles</th>
                <th className="px-4 py-3 text-right font-medium">Round-Trip Miles</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {data.patients.map((row) => (
                <tr key={row.patientId || "none"} className="border-t border-gray-800">
                  <td className="px-4 py-3 text-gray-100">
                    <span className="inline-flex items-center gap-1.5">
                      {row.patientColor && <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: row.patientColor }} />}
                      {row.patientName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{row.appointmentCount}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{row.totalMiles.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{row.roundTripMiles.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-gray-700 bg-gray-800/50">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-400">Per-Patient Total</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-200">{data.totals.appointmentCount}</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-200">{data.totals.totalMiles.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-200">{data.totals.roundTripMiles.toFixed(2)}</td>
              </tr>
              <tr className="border-t border-gray-700">
                <td className="px-4 py-2 text-sm font-medium text-gray-300">Actual Miles Driven</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-300">{data.tripTotals.tripCount} trips</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-100">{data.tripTotals.totalMiles.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-100">{data.tripTotals.roundTripMiles.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
