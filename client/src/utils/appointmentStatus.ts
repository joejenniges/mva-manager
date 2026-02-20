interface CostItem {
  amount: string;
  type: string;
}

export function calculateBalance(items: CostItem[]): { charges: number; payments: number; balance: number } {
  const charges = items.filter((i) => i.type === "charge").reduce((s, i) => s + parseFloat(i.amount), 0);
  const payments = items
    .filter((i) => i.type !== "charge")
    .reduce((s, i) => s + parseFloat(i.amount), 0);
  return { charges, payments, balance: (charges - payments) || 0 };
}

export type VisitStatus = "Scheduled" | "Completed" | "Billed" | "Paid";

// WHY: Visit status is derived, not stored. It can be reliably computed from
// datetime + cost items. Insurance status is different - it requires explicit
// user input and lives as a DB column.
export function getVisitStatus(datetime: string, items: CostItem[]): VisitStatus {
  const isPast = new Date(datetime) < new Date();
  if (!isPast) return "Scheduled";

  const { charges, balance } = calculateBalance(items);
  if (charges === 0) return "Completed";
  if (balance <= 0) return "Paid";
  return "Billed";
}
