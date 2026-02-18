import { calculateBalance } from "../utils/appointmentStatus";

interface CostItem {
  amount: string;
  type: string;
}

interface Props {
  items: CostItem[];
}

export default function BillingSummaryStrip({ items }: Props) {
  const { charges, payments, balance } = calculateBalance(items);

  const balanceColor =
    balance > 0 ? "text-red-400" : charges > 0 ? "text-green-500" : "text-gray-400";

  return (
    <div className="flex flex-wrap gap-6 rounded-lg border border-gray-700 bg-gray-900 px-4 py-3">
      <div>
        <div className="text-xs uppercase text-gray-500">Charges</div>
        <div className="font-mono text-lg tabular-nums text-gray-100">
          ${charges.toFixed(2)}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase text-gray-500">Payments</div>
        <div className="font-mono text-lg tabular-nums text-green-400">
          ${payments.toFixed(2)}
        </div>
      </div>
      <div>
        <div className="text-xs uppercase text-gray-500">Balance</div>
        <div className={`font-mono text-lg tabular-nums ${balanceColor}`}>
          ${balance.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
