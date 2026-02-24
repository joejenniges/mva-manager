import { useState } from "react";
import Spinner from "./Spinner";

interface CostItem {
  id: string;
  description: string | null;
  billingCode: string | null;
  amount: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  charge: "Charge",
  payment: "Payment",
  adjustment: "Adjustment",
  write_off: "Write-off",
  patient_payment: "Patient Payment",
};

const TYPE_COLORS: Record<string, string> = {
  charge: "text-gray-100",
  payment: "text-green-400",
  adjustment: "text-blue-400",
  write_off: "text-yellow-400",
  patient_payment: "text-green-300",
};

export default function CostTable({ items, onDelete }: {
  items: CostItem[];
  onDelete?: (id: string) => Promise<void>;
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            {onDelete && <th className="w-8"></th>}
          </tr>
        </thead>
        <tbody className="bg-gray-900">
          {items.map((item) => (
            <CostRow key={item.id} item={item} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostRow({ item, onDelete }: { item: CostItem; onDelete?: (id: string) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");

  async function handleClick() {
    if (state === "idle") {
      setState("confirm");
      return;
    }
    if (state === "confirm") {
      setState("deleting");
      try {
        await onDelete?.(item.id);
      } catch {
        setState("idle");
      }
    }
  }

  return (
    <tr className="border-t border-gray-800">
      <td className={`px-3 py-2 ${TYPE_COLORS[item.type] || "text-gray-300"}`}>{TYPE_LABELS[item.type]}</td>
      <td className="px-3 py-2 text-gray-300">{item.description || "-"}</td>
      <td className="px-3 py-2 font-mono text-xs text-gray-400">{item.billingCode || "-"}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-gray-100">${parseFloat(item.amount).toFixed(2)}</td>
      {onDelete && (
        <td className="px-3 py-2">
          {state === "deleting" ? (
            <Spinner size="sm" />
          ) : (
            <button
              onClick={handleClick}
              onBlur={() => { if (state === "confirm") setState("idle"); }}
              className={state === "confirm" ? "font-bold text-red-400" : "text-gray-500 hover:text-red-400"}
              title={state === "confirm" ? "Click again to confirm" : "Delete"}
            >
              {state === "confirm" ? "?" : "x"}
            </button>
          )}
        </td>
      )}
    </tr>
  );
}
