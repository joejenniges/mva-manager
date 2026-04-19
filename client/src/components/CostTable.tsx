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

// WHY: Group items so payments/adjustments/write-offs appear under their matching
// charge (by billingCode), preserving the original order of charges. Orphan
// non-charge items (no matching charge) fall to the end in original order.
function groupByCharge(items: CostItem[]): CostItem[] {
  const result: CostItem[] = [];
  const used = new Set<string>();
  items.forEach((item) => {
    if (used.has(item.id) || item.type !== "charge") return;
    result.push(item);
    used.add(item.id);
    if (!item.billingCode) return;
    items.forEach((other) => {
      if (used.has(other.id)) return;
      if (other.type !== "charge" && other.billingCode === item.billingCode) {
        result.push(other);
        used.add(other.id);
      }
    });
  });
  items.forEach((item) => {
    if (!used.has(item.id)) result.push(item);
  });
  return result;
}

export default function CostTable({ items, onDelete, onAddPayment }: {
  items: CostItem[];
  onDelete?: (id: string) => Promise<void>;
  onAddPayment?: (item: CostItem) => void;
}) {
  if (items.length === 0) return null;

  const ordered = groupByCharge(items);
  const showActions = Boolean(onDelete || onAddPayment);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            {showActions && <th className="w-16"></th>}
          </tr>
        </thead>
        <tbody className="bg-gray-900">
          {ordered.map((item) => (
            <CostRow key={item.id} item={item} onDelete={onDelete} onAddPayment={onAddPayment} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostRow({ item, onDelete, onAddPayment }: {
  item: CostItem;
  onDelete?: (id: string) => Promise<void>;
  onAddPayment?: (item: CostItem) => void;
}) {
  const [state, setState] = useState<"idle" | "confirm" | "deleting">("idle");
  const showActions = Boolean(onDelete || onAddPayment);
  const showPaymentButton = onAddPayment && item.type === "charge";

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
      {showActions && (
        <td className="px-3 py-2 whitespace-nowrap">
          {onAddPayment && (
            // WHY: Always reserve the slot width (even on non-charge rows) so the
            // following delete `x` aligns across all rows. Placeholder is invisible
            // but takes the same space as the real button.
            showPaymentButton ? (
              <button
                onClick={() => onAddPayment(item)}
                className="mr-2 inline-block w-3 text-center text-gray-500 hover:text-green-400"
                title="Add payment for this charge"
              >
                $
              </button>
            ) : (
              <span className="mr-2 inline-block w-3" aria-hidden />
            )
          )}
          {onDelete && (
            state === "deleting" ? (
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
            )
          )}
        </td>
      )}
    </tr>
  );
}
