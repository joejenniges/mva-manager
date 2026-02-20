interface CostItem {
  amount: string;
  type: string;
}

// WHY: All arithmetic in integer cents to avoid IEEE 754 float drift entirely.
// parseFloat("81.20") * 100 = 8120.000000000001, so we round to int immediately.
const toCents = (s: string) => Math.round(parseFloat(s) * 100);
const toDollars = (c: number) => c / 100;

export function calculateBalance(items: CostItem[]): { charges: number; payments: number; balance: number } {
  let chargesCents = 0, paymentsCents = 0;
  for (const item of items) {
    if (item.type === "charge") chargesCents += toCents(item.amount);
    else paymentsCents += toCents(item.amount);
  }
  return {
    charges: toDollars(chargesCents),
    payments: toDollars(paymentsCents),
    balance: toDollars(chargesCents - paymentsCents),
  };
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
