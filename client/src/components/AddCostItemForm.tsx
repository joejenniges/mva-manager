import { useState, forwardRef, useImperativeHandle, useRef } from "react";
import { api } from "../api";

const TYPE_LABELS: Record<string, string> = {
  charge: "Charge",
  payment: "Payment",
  adjustment: "Adjustment",
  write_off: "Write-off",
  patient_payment: "Patient Payment",
};

export interface AddCostItemFormHandle {
  scrollIntoView: (defaultType?: string) => void;
  focusDescription: (defaultType?: string) => void;
}

interface Props {
  appointmentId: string;
  onAdded: () => void;
}

const AddCostItemForm = forwardRef<AddCostItemFormHandle, Props>(function AddCostItemForm({ appointmentId, onAdded }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const [newItem, setNewItem] = useState({ description: "", billingCode: "", amount: "", type: "charge" });
  const [adding, setAdding] = useState(false);
  const [amountError, setAmountError] = useState(false);

  useImperativeHandle(ref, () => ({
    scrollIntoView: (defaultType?: string) => {
      if (defaultType) {
        setNewItem((prev) => ({ ...prev, type: defaultType }));
      }
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    focusDescription: (defaultType?: string) => {
      if (defaultType) {
        setNewItem((prev) => ({ ...prev, type: defaultType }));
      }
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      // Small delay so scroll completes before focus
      setTimeout(() => descriptionRef.current?.focus(), 100);
    },
  }));

  function handleAmountBlur() {
    if (!newItem.amount) { setAmountError(false); return; }
    const num = parseFloat(newItem.amount);
    if (isNaN(num)) {
      setAmountError(true);
      return;
    }
    setAmountError(false);
    setNewItem((prev) => ({ ...prev, amount: num.toFixed(2) }));
  }

  async function addItem() {
    if (!newItem.amount) return;
    const num = parseFloat(newItem.amount);
    if (isNaN(num)) { setAmountError(true); return; }

    setAdding(true);
    try {
      await api(`/api/v1/appointments/${appointmentId}/cost-items`, {
        body: {
          description: newItem.description || null,
          billingCode: newItem.billingCode || null,
          amount: num.toFixed(2),
          type: newItem.type,
        },
      });
      setNewItem({ description: "", billingCode: "", amount: "", type: "charge" });
      setAmountError(false);
      onAdded();
    } catch {} finally {
      setAdding(false);
    }
  }

  return (
    <div ref={containerRef} className="rounded-lg border border-gray-700/50 bg-gray-800/50 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={newItem.type}
          onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
          className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <input
          ref={descriptionRef}
          placeholder="Description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <input
          placeholder="Code"
          value={newItem.billingCode}
          onChange={(e) => setNewItem({ ...newItem, billingCode: e.target.value })}
          className="w-24 rounded-md border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:border-blue-500 focus:outline-none"
        />
        <input
          placeholder="Amount"
          inputMode="decimal"
          value={newItem.amount}
          onChange={(e) => { setNewItem({ ...newItem, amount: e.target.value }); setAmountError(false); }}
          onBlur={handleAmountBlur}
          className={`w-28 rounded-md border bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none ${
            amountError ? "border-red-500 focus:border-red-500" : "border-gray-700 focus:border-blue-500"
          }`}
        />
        <button
          onClick={addItem}
          disabled={adding || !newItem.amount}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          + Add Item
        </button>
      </div>
    </div>
  );
});

export default AddCostItemForm;
