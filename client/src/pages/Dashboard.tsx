import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useEvent } from "../event";
import Spinner from "../components/Spinner";

interface AppointmentSummary {
  id: string;
  title: string | null;
  datetime: string;
  organizationName: string | null;
  isToday: boolean;
}

interface DashboardData {
  patient: { id: string; name: string; color: string | null } | null;
  appointments: { thisWeek: AppointmentSummary[] };
  financials: {
    totalCharges: number;
    totalPayments: number;
    balance: number;
  };
  mileage: {
    totalMiles: number;
    roundTripMiles: number;
  };
}

const formatDollars = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export default function Dashboard() {
  const { activeEvent } = useEvent();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeEvent) return;
    setLoading(true);
    setError(null);
    api<DashboardData>("/api/v1/dashboard")
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [activeEvent?.id]);

  if (loading) return <Spinner className="py-12" />;
  if (error) return <p className="py-8 text-center text-red-400">{error}</p>;
  if (!data) return null;

  if (!data.patient) {
    return (
      <div>
        <h2 className="mb-4 text-2xl font-semibold text-gray-100">Dashboard</h2>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-center">
          <p className="text-gray-400">No patient linked to your account for this case.</p>
          <p className="mt-1 text-sm text-gray-500">
            Ask an admin to set your default patient in the Users page.
          </p>
        </div>
      </div>
    );
  }

  const { patient, appointments, financials, mileage } = data;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-gray-100">Dashboard</h2>
        <span
          className="rounded-full px-3 py-0.5 text-sm font-medium"
          style={{
            backgroundColor: patient.color ? `${patient.color}20` : "#6b728020",
            color: patient.color || "#9ca3af",
          }}
        >
          {patient.name}
        </span>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-xs font-medium text-gray-400">Total Charges</div>
          <div className="mt-1 text-xl font-semibold text-gray-100">{formatDollars(financials.totalCharges)}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-xs font-medium text-gray-400">Total Paid</div>
          <div className="mt-1 text-xl font-semibold text-gray-100">{formatDollars(financials.totalPayments)}</div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-xs font-medium text-gray-400">Balance</div>
          <div className={`mt-1 text-xl font-semibold ${financials.balance > 0 ? "text-amber-400" : "text-green-400"}`}>
            {formatDollars(financials.balance)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="text-xs font-medium text-gray-400">Mileage</div>
          <div className="mt-1 text-xl font-semibold text-gray-100">{mileage.roundTripMiles.toFixed(1)} mi</div>
          <div className="text-xs text-gray-500">{mileage.totalMiles.toFixed(1)} one-way</div>
        </div>
      </div>

      {/* This week's appointments */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-400">This Week</h3>
        {appointments.thisWeek.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 text-center text-sm text-gray-500">
            No appointments this week
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.thisWeek.map((appt) => (
              <Link
                key={appt.id}
                to={`/appointments/${appt.id}`}
                className={`block rounded-lg border p-3 transition-colors hover:border-gray-600 ${
                  appt.isToday
                    ? "border-blue-500/40 bg-blue-950/30"
                    : "border-gray-700 bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-100">
                        {appt.title || appt.organizationName || "Appointment"}
                      </span>
                      {appt.isToday && (
                        <span className="rounded bg-blue-600/30 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
                          Today
                        </span>
                      )}
                    </div>
                    {appt.organizationName && appt.title && (
                      <div className="text-xs text-gray-500">{appt.organizationName}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-sm text-gray-400">
                    <div>{formatDate(appt.datetime)}</div>
                    <div className="text-xs text-gray-500">{formatTime(appt.datetime)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
