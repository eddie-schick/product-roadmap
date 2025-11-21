import { STATUS_COLORS } from '@/types/database';

interface StatusBadgeProps {
  status: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;

  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass} transition-colors duration-150`}>
      {status}
    </span>
  );
}
