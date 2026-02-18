type StatusType =
  | "Scheduled" | "Completed" | "Billed" | "Paid"
  | "pending" | "submitted" | "denied" | "paid";

const STATUS_STYLES: Record<StatusType, string> = {
  // Visit statuses
  Scheduled: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  Completed: "bg-gray-800 text-gray-300 border-gray-600",
  Billed: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  Paid: "bg-green-900/50 text-green-300 border-green-700/50",
  // Insurance statuses
  pending: "bg-gray-800 text-gray-300 border-gray-600",
  submitted: "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  denied: "bg-red-900/50 text-red-300 border-red-700/50",
  paid: "bg-green-900/50 text-green-300 border-green-700/50",
};

const INSURANCE_LABELS: Record<string, string> = {
  pending: "Ins: Pending",
  submitted: "Ins: Submitted",
  denied: "Ins: Denied",
  paid: "Ins: Paid",
};

interface Props {
  status: StatusType;
  className?: string;
  onClick?: () => void;
}

export default function StatusBadge({ status, className = "", onClick }: Props) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Completed;
  const label = INSURANCE_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {label}
    </span>
  );
}
