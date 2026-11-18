type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'border-[#d7dfdc] bg-[#f1f4f2] text-[#4b5d56]',
  info: 'border-[#bfd8e5] bg-[#edf6fa] text-[#17679b]',
  success: 'border-[#b9dcd1] bg-[#edf8f3] text-[#14745f]',
  warning: 'border-[#e7d1a8] bg-[#fcf6e9] text-[#885100]',
  danger: 'border-[#e7c2be] bg-[#fcf0ef] text-[#a3342f]',
};

const dotColors: Record<StatusTone, string> = {
  neutral: 'bg-[#71827b]',
  info: 'bg-[#17679b]',
  success: 'bg-[#16856b]',
  warning: 'bg-[#a15b00]',
  danger: 'bg-[#b93a36]',
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${toneClasses[tone]}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 shrink-0 ${dotColors[tone]}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
