type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-[#f1f1ef] text-[#5f5f59]',
  info: 'bg-[#edf5fa] text-[#17679b]',
  success: 'bg-[#edf7f1] text-[#14745f]',
  warning: 'bg-[#fcf5e7] text-[#885100]',
  danger: 'bg-[#fbf0ee] text-[#a3342f]',
};

const dotColors: Record<StatusTone, string> = {
  neutral: 'bg-[#73736e]',
  info: 'bg-[#17679b]',
  success: 'bg-[#16856b]',
  warning: 'bg-[#a15b00]',
  danger: 'bg-[#b93a36]',
};

function formatBadgeLabel(label: string): string {
  if (label.includes('_') || (!label.includes(' ') && /^[a-z]/.test(label))) {
    const clean = label.replace(/_/g, ' ').trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return label;
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${toneClasses[tone]}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[tone]}`}
        aria-hidden="true"
      />
      {formatBadgeLabel(label)}
    </span>
  );
}
