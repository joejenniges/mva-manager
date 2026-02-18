import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import type { PaginatedResponse } from "../types";
import TagBadge from "../components/TagBadge";
import Spinner from "../components/Spinner";
import EmptyState from "../components/EmptyState";
import TemplateQuickAdd from "../components/TemplateQuickAdd";
import useHotkeys from "../hooks/useHotkeys";
import useTableNavigation from "../hooks/useTableNavigation";
import { normalizeDateValue } from "../utils/dateInput";

interface AppointmentRow {
  id: string;
  title: string | null;
  datetime: string;
  organization: { id: string; name: string; color: string | null } | null;
  patient: { id: string; name: string; color: string | null } | null;
  appointmentActivities: { activity: { id: string; title: string; color: string } }[];
  costItems: { amount: string; type: string }[];
  documentAppointments: { documentId: string }[];
}

interface FilterOption {
  id: string;
  name: string;
}

type SortField = "datetime" | "title" | "patient" | "organization";

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<AppointmentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [patientId, setPatientId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [sort, setSort] = useState<SortField>("datetime");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalCharges, setTotalCharges] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const tableNav = useTableNavigation({
    itemCount: data.length,
    onSelect: (i) => navigate(`/appointments/${data[i].id}`),
  });

  useHotkeys({
    s: () => searchRef.current?.focus(),
    Escape: () => {
      if (showTemplateModal) setShowTemplateModal(false);
      else (document.activeElement as HTMLElement)?.blur();
    },
    n: () => navigate("/appointments/new"),
    f: () => setShowTemplateModal(true),
    ",": () => setPage((p) => Math.max(1, p - 1)),
    ".": () => setPage((p) => Math.min(p + 1, Math.ceil(total / limit) || 1)),
    ...tableNav.hotkeys,
  });

  // Filter dropdown options
  const [patients, setPatients] = useState<FilterOption[]>([]);
  const [orgs, setOrgs] = useState<FilterOption[]>([]);

  const [limit, setLimit] = useState(25);

  // Fetch filter options once
  useEffect(() => {
    api<PaginatedResponse<{ id: string; name: string }>>("/api/v1/persons?isPatient=true&limit=100")
      .then((res) => setPatients(res.data))
      .catch(() => {});
    api<PaginatedResponse<{ id: string; name: string }>>("/api/v1/organizations?limit=100")
      .then((res) => setOrgs(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (patientId) params.set("patientId", patientId);
    if (organizationId) params.set("organizationId", organizationId);

    api<PaginatedResponse<AppointmentRow> & { totalCharges: number; totalCredits: number }>(`/api/v1/appointments?${params}`)
      .then((res) => { setData(res.data); setTotal(res.total); setTotalCharges(res.totalCharges); setTotalCredits(res.totalCredits); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, search, dateFrom, dateTo, patientId, organizationId, sort, order, refreshKey]);

  function costSummary(items: { amount: string; type: string }[]) {
    let charges = 0, credits = 0;
    for (const item of items) {
      const amt = parseFloat(item.amount);
      if (item.type === "charge") charges += amt;
      else credits += amt;
    }
    const balance = charges - credits;
    return { charges, balance };
  }

  function handleSort(field: SortField) {
    if (sort === field) {
      setOrder((o) => o === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
    setPage(1);
  }

  const totalBalance = totalCharges - totalCredits;
  const hasFilters = search || dateFrom || dateTo || patientId || organizationId;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-100">Appointments</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplateModal(true)}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
          >
            From Template
            <kbd className="relative -top-px ml-1.5 rounded border border-gray-500/30 bg-gray-600/50 px-1 py-0.5 font-mono text-[10px] text-gray-400">F</kbd>
          </button>
          <button
            onClick={() => navigate("/appointments/new")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            New Appointment
            <kbd className="relative -top-px ml-1.5 rounded border border-blue-400/30 bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">N</kbd>
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search appointments...  (S)"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={patientId}
          onChange={(e) => { setPatientId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={organizationId}
          onChange={(e) => { setOrganizationId(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">All Organizations</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          onBlur={(e) => setDateFrom(normalizeDateValue(e.target.value))}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          onBlur={(e) => setDateTo(normalizeDateValue(e.target.value))}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <SortHeader field="datetime" label="Date" sort={sort} order={order} onSort={handleSort} className="w-32" />
              <SortHeader field="patient" label="Patient" sort={sort} order={order} onSort={handleSort} className="w-28" />
              <SortHeader field="organization" label="Organization" sort={sort} order={order} onSort={handleSort} />
              <SortHeader field="title" label="Title" sort={sort} order={order} onSort={handleSort} />
              <th className="px-4 py-3 text-left font-medium">Activities</th>
              <th className="px-4 py-3 text-right font-medium">Docs</th>
              <th className="px-4 py-3 text-right font-medium">Charges</th>
              <th className="px-4 py-3 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="bg-gray-900">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8"><Spinner className="py-4" /></td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState
                  title="No appointments found"
                  description={hasFilters ? "Try different filters." : "Create your first appointment to get started."}
                  action={!hasFilters ? { label: "New Appointment", onClick: () => navigate("/appointments/new") } : undefined}
                />
              </td></tr>
            ) : data.map((appt, i) => {
              const { charges, balance } = costSummary(appt.costItems);
              return (
                <tr
                  key={appt.id}
                  data-row-index={i}
                  onClick={() => navigate(`/appointments/${appt.id}`)}
                  className={`cursor-pointer border-t border-gray-800 hover:bg-gray-800/50 ${tableNav.selectedIndex === i ? "bg-blue-900/20 outline outline-1 outline-blue-500/50" : ""}`}
                >
                  <td className="w-32 px-4 py-3 text-gray-300">
                    {new Date(appt.datetime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="w-28 px-4 py-3 text-gray-300">
                    {appt.patient ? <ColorDot name={appt.patient.name} color={appt.patient.color} /> : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {appt.organization ? <ColorDot name={appt.organization.name} color={appt.organization.color} /> : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-100">{appt.title || "Untitled"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {appt.appointmentActivities.map((aa) => (
                        <TagBadge key={aa.activity.id} label={aa.activity.title} color={aa.activity.color} />
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right ${appt.documentAppointments.length === 0 ? "text-red-400" : (appt.documentAppointments.length == 1 ? "text-yellow-400" : "text-gray-300")}`}>
                    {appt.documentAppointments.length}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{charges > 0 ? `$${charges.toFixed(2)}` : "-"}</td>
                  <td className={`px-4 py-3 text-right ${balance > 0 ? "text-yellow-400" : balance === 0 && charges > 0 ? "text-green-500" : "text-gray-500"}`}>
                    {charges > 0 ? `$${balance.toFixed(2)}` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {!loading && data.length > 0 && (
            <tfoot className="border-t border-gray-700 bg-gray-800/50">
              <tr>
                <td colSpan={6} className="px-4 py-2 text-right text-sm font-medium text-gray-400">Total ({total} appointments)</td>
                <td className="px-4 py-2 text-right text-sm font-medium text-gray-200">{totalCharges > 0 ? `$${totalCharges.toFixed(2)}` : "-"}</td>
                <td className={`px-4 py-2 text-right text-sm font-medium ${totalBalance > 0 ? "text-yellow-400" : totalBalance === 0 && totalCharges > 0 ? "text-green-500" : "text-gray-500"}`}>
                  {totalCharges > 0 ? `$${totalBalance.toFixed(2)}` : "-"}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-3">
            <span>{total} appointments</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>{n} per page</option>
              ))}
            </select>
          </div>
          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
              >
                Prev
                <kbd className="relative -top-px ml-1.5 rounded border border-gray-500/30 bg-gray-600/50 px-1 py-0.5 font-mono text-[10px] text-gray-400">,</kbd>
              </button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-gray-700 px-3 py-1 hover:bg-gray-800 disabled:opacity-50"
              >
                Next
                <kbd className="relative -top-px ml-1.5 rounded border border-gray-500/30 bg-gray-600/50 px-1 py-0.5 font-mono text-[10px] text-gray-400">.</kbd>
              </button>
            </div>
          )}
        </div>
      )}

      {showTemplateModal && (
        <TemplateQuickAdd onClose={() => setShowTemplateModal(false)} onCreated={() => setRefreshKey((k) => k + 1)} />
      )}
    </div>
  );
}

function ColorDot({ name, color }: { name: string; color: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {color && <span className="inline-block h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      {name}
    </span>
  );
}

function SortHeader({ field, label, sort, order, onSort, className }: {
  field: SortField;
  label: string;
  sort: SortField;
  order: "asc" | "desc";
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const active = sort === field;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-left font-medium hover:text-gray-100 ${className || ""}`}
      onClick={() => onSort(field)}
    >
      {label}
      {active && (
        <span className="ml-1 text-blue-400">{order === "asc" ? "\u2191" : "\u2193"}</span>
      )}
    </th>
  );
}
