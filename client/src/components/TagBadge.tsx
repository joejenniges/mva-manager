interface TagBadgeProps {
  label: string;
  color: string;
}

export default function TagBadge({ label, color }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
