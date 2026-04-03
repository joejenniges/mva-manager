import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../api";
import type { PaginatedResponse } from "../../types";
import Spinner from "../Spinner";
import { normalizeDateValue } from "../../utils/dateInput";

interface AppointmentRow {
  id: string;
  title: string | null;
  datetime: string;
  organization: { id: string; name: string; color: string | null } | null;
  patient: { id: string; name: string; color: string | null } | null;
  costItems: { amount: string; type: string }[];
}

interface FilterOption {
  id: string;
  name: string;
}

interface Props {
  included: AppointmentRow[];
  onIncludedChange: (appointments: AppointmentRow[]) => void;
}

function chargeTotal(items: { amount: string; type: string }[]): number {
  let cents = 0;
  for (const item of items) {
    if (item.type === "charge") cents += Math.round(parseFloat(item.amount) * 100);
  }
  return cents / 100;
}

function formatDate(datetime: string): string {
  return new Date(datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function AppointmentShuttle({ included, onIncludedChange }: Props) {
  const [available, setAvailable] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<FilterOption[]>([]);
  const [orgs, setOrgs] = useState<FilterOption[]>([]);

  // Filters
  const [patientId, setPatientId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Selection state
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [selectedIncluded, setSelectedIncluded] = useState<Set<string>>(new Set());
  const lastClickedAvailable = useRef<string | null>(null);
  const lastClickedIncluded = useRef<string | null>(null);

  const includedIds = new Set(included.map((a) => a.id));

  function sortByDate(appts: AppointmentRow[]): AppointmentRow[] {
    return [...appts].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }

  // Load filter options once
  useEffect(() => {
    api<PaginatedResponse<FilterOption>>("/api/v1/persons?isPatient=true&limit=100")
      .then((res) => setPatients(res.data))
      .catch(() => {});
    api<PaginatedResponse<FilterOption>>("/api/v1/organizations?limit=100")
      .then((res) => setOrgs(res.data))
      .catch(() => {});
  }, []);

  // Fetch available appointments
  const fetchAvailable = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200", sort: "datetime", order: "asc" });
    if (patientId) params.set("patientId", patientId);
    if (organizationId) params.set("organizationId", organizationId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);

    api<PaginatedResponse<AppointmentRow>>(`/api/v1/appointments?${params}`)
      .then((res) => setAvailable(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId, organizationId, dateFrom, dateTo]);

  useEffect(() => {
    fetchAvailable();
  }, [fetchAvailable]);

  // Filter out already-included from available
  const filteredAvailable = available.filter((a) => !includedIds.has(a.id));

  function handleRowClick(
    id: string,
    list: AppointmentRow[],
    selected: Set<string>,
    setSelected: (s: Set<string>) => void,
    lastClicked: React.MutableRefObject<string | null>,
    e: React.MouseEvent,
  ) {
    const next = new Set(selected);

    if (e.shiftKey && lastClicked.current) {
      // Range select
      const ids = list.map((a) => a.id);
      const start = ids.indexOf(lastClicked.current);
      const end = ids.indexOf(id);
      if (start !== -1 && end !== -1) {
        const [lo, hi] = start < end ? [start, end] : [end, start];
        for (let i = lo; i <= hi; i++) {
          next.add(ids[i]);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle single
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      // Single select
      next.clear();
      next.add(id);
    }

    lastClicked.current = id;
    setSelected(next);
  }

  function moveToIncluded() {
    const toAdd = filteredAvailable.filter((a) => selectedAvailable.has(a.id));
    if (toAdd.length === 0) return;
    onIncludedChange(sortByDate([...included, ...toAdd]));
    setSelectedAvailable(new Set());
  }

  function moveToAvailable() {
    const removeIds = selectedIncluded;
    if (removeIds.size === 0) return;
    onIncludedChange(included.filter((a) => !removeIds.has(a.id)));
    setSelectedIncluded(new Set());
  }

  function addAll() {
    onIncludedChange(sortByDate([...included, ...filteredAvailable]));
    setSelectedAvailable(new Set());
  }

  function removeAll() {
    onIncludedChange([]);
    setSelectedIncluded(new Set());
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Patients</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Organizations</option>
          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onBlur={(e) => setDateFrom(normalizeDateValue(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onBlur={(e) => setDateTo(normalizeDateValue(e.target.value))}
            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      {/* Available list */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Available ({filteredAvailable.length})</span>
          <button
            onClick={addAll}
            disabled={filteredAvailable.length === 0}
            className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600"
          >
            Add All
          </button>
        </div>
        <div className="h-40 overflow-y-auto rounded-md border border-gray-700 bg-gray-900">
          {loading ? (
            <Spinner className="py-4" />
          ) : filteredAvailable.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-600">No available appointments</div>
          ) : (
            filteredAvailable.map((appt) => (
              <ShuttleRow
                key={appt.id}
                appt={appt}
                selected={selectedAvailable.has(appt.id)}
                onClick={(e) => handleRowClick(appt.id, filteredAvailable, selectedAvailable, setSelectedAvailable, lastClickedAvailable, e)}
              />
            ))
          )}
        </div>
      </div>

      {/* Transfer buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={moveToIncluded}
          disabled={selectedAvailable.size === 0}
          className="rounded-md border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-800 disabled:text-gray-600 disabled:hover:bg-transparent"
          title="Add selected to report"
        >
          Add to Report ↓
        </button>
        <button
          onClick={moveToAvailable}
          disabled={selectedIncluded.size === 0}
          className="rounded-md border border-gray-700 px-3 py-1 text-sm text-gray-300 hover:bg-gray-800 disabled:text-gray-600 disabled:hover:bg-transparent"
          title="Remove selected from report"
        >
          ↑ Remove
        </button>
      </div>

      {/* Included list */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">Included in Report ({included.length})</span>
          <button
            onClick={removeAll}
            disabled={included.length === 0}
            className="text-xs text-red-400 hover:text-red-300 disabled:text-gray-600"
          >
            Remove All
          </button>
        </div>
        <div className="h-40 overflow-y-auto rounded-md border border-gray-700 bg-gray-900">
          {included.length === 0 ? (
            <div className="py-4 text-center text-xs text-gray-600">No appointments selected</div>
          ) : (
            included.map((appt) => (
              <ShuttleRow
                key={appt.id}
                appt={appt}
                selected={selectedIncluded.has(appt.id)}
                onClick={(e) => handleRowClick(appt.id, included, selectedIncluded, setSelectedIncluded, lastClickedIncluded, e)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ShuttleRow({ appt, selected, onClick }: {
  appt: AppointmentRow;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const charges = chargeTotal(appt.costItems);

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer select-none items-center gap-2 border-b border-gray-800 px-2 py-1.5 text-xs ${
        selected ? "bg-blue-900/30 outline outline-1 outline-blue-500/50" : "hover:bg-gray-800/50"
      }`}
    >
      <span className="w-16 shrink-0 text-gray-400">{formatDate(appt.datetime)}</span>
      <span className="min-w-0 flex-1 truncate text-gray-200">{appt.patient?.name || "-"}</span>
      <span className="min-w-0 flex-1 truncate text-gray-400">{appt.organization?.name || "-"}</span>
      <span className="w-16 shrink-0 text-right text-gray-300">
        {charges > 0 ? `$${charges.toFixed(2)}` : "-"}
      </span>
    </div>
  );
}
