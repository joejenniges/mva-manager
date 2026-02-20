import { useState, useEffect } from "react";
import { api } from "../api";
import Spinner from "./Spinner";
import { useToast } from "./Toast";

interface CostItem {
  id: string;
  description: string | null;
  billingCode: string | null;
  amount: string;
  type: string;
}

interface AppointmentSummary {
  id: string;
  title: string | null;
  datetime: string;
  organization: { id: string; name: string; color: string | null } | null;
  patient: { id: string; name: string; color: string | null } | null;
  costItems: CostItem[];
}

interface Props {
  appointmentId: string;
  organizationId: string;
  onCopied: () => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  charge: "Charge",
  payment: "Payment",
  adjustment: "Adjustment",
  write_off: "Write-off",
  patient_payment: "Patient Pmt",
};

const TYPE_COLORS: Record<string, string> = {
  charge: "text-gray-100",
  payment: "text-green-400",
  adjustment: "text-blue-400",
  write_off: "text-yellow-400",
  patient_payment: "text-green-300",
};

export default function CopyCostsModal({ appointmentId, organizationId, onCopied, onClose }: Props) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<AppointmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApptId, setSelectedApptId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    api<{ data: AppointmentSummary[] }>(`/api/v1/appointments?organizationId=${organizationId}&limit=200&sort=datetime&order=desc`)
      .then((res) => {
        // Exclude the current appointment and those with no cost items
        setAppointments(res.data.filter((a) => a.id !== appointmentId && a.costItems.length > 0));
      })
      .catch(() => toast("Failed to load appointments", "error"))
      .finally(() => setLoading(false));
  }, [organizationId, appointmentId, toast]);

  function handleSelectAppt(id: string) {
    setSelectedApptId(id);
    setSelectedItems(new Set());
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(items: CostItem[]) {
    const allSelected = items.every((i) => selectedItems.has(i.id));
    if (allSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.id)));
    }
  }

  async function handleCopy() {
    const sourceAppt = appointments.find((a) => a.id === selectedApptId);
    if (!sourceAppt) return;

    const itemsToCopy = sourceAppt.costItems.filter((i) => selectedItems.has(i.id));
    if (itemsToCopy.length === 0) return;

    setCopying(true);
    try {
      await api(`/api/v1/appointments/${appointmentId}/cost-items/bulk`, {
        body: {
          items: itemsToCopy.map((i) => ({
            description: i.description,
            billingCode: i.billingCode,
            amount: i.amount,
            type: i.type,
          })),
        },
      });
      toast(`Copied ${itemsToCopy.length} item${itemsToCopy.length > 1 ? "s" : ""}`, "success");
      onCopied();
      onClose();
    } catch {
      toast("Failed to copy items", "error");
    } finally {
      setCopying(false);
    }
  }

  const selectedAppt = appointments.find((a) => a.id === selectedApptId);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col rounded-lg border border-gray-700 bg-gray-900 shadow-xl md:inset-auto md:left-1/2 md:top-1/2 md:h-[600px] md:w-[800px] md:-translate-x-1/2 md:-translate-y-1/2">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h3 className="text-sm font-medium text-gray-100">Copy Charges & Payments</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left: Appointment list */}
          <div className="w-1/2 overflow-y-auto border-r border-gray-700">
            {loading ? (
              <Spinner className="py-12" />
            ) : appointments.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No other appointments with charges for this organization.</div>
            ) : (
              appointments.map((appt) => {
                const dt = new Date(appt.datetime);
                const isSelected = appt.id === selectedApptId;
                return (
                  <button
                    key={appt.id}
                    onClick={() => handleSelectAppt(appt.id)}
                    className={`w-full border-b border-gray-800 px-4 py-3 text-left transition-colors ${
                      isSelected ? "bg-gray-800" : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="text-sm text-gray-200">
                      {dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {appt.patient?.name || "No patient"}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {appt.costItems.length} item{appt.costItems.length !== 1 ? "s" : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Cost items from selected appointment */}
          <div className="flex w-1/2 flex-col overflow-y-auto">
            {!selectedAppt ? (
              <div className="flex flex-1 items-center justify-center p-4 text-sm text-gray-500">
                Select an appointment to see its charges & payments
              </div>
            ) : (
              <>
                <div className="border-b border-gray-700 px-4 py-2">
                  <button
                    onClick={() => toggleAll(selectedAppt.costItems)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {selectedAppt.costItems.every((i) => selectedItems.has(i.id)) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {selectedAppt.costItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-gray-800 px-4 py-2.5 hover:bg-gray-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${TYPE_COLORS[item.type] || "text-gray-300"}`}>
                            {TYPE_LABELS[item.type] || item.type}
                          </span>
                          {item.billingCode && (
                            <span className="font-mono text-[10px] text-gray-500">{item.billingCode}</span>
                          )}
                        </div>
                        {item.description && (
                          <div className="truncate text-xs text-gray-400">{item.description}</div>
                        )}
                      </div>
                      <span className="font-mono text-sm tabular-nums text-gray-200">
                        ${parseFloat(item.amount).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-700 px-4 py-3">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200">
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={copying || selectedItems.size === 0}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {copying ? "Copying..." : `Copy ${selectedItems.size > 0 ? selectedItems.size : ""} Item${selectedItems.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </>
  );
}
