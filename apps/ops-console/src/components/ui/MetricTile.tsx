import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type MetricTileProps = {
  title: string;
  value: string | number;
  detail: string;
  tone?: MetricTone;
  cta?: { label: string; href: string };
  className?: string;
};

const dotColors: Record<MetricTone, string> = {
  neutral: 'bg-[#73736e]',
  success: 'bg-[#16856b]',
  warning: 'bg-[#a15b00]',
  danger: 'bg-[#b93a36]',
  info: 'bg-[#17679b]',
};

export function MetricTile({ title, value, detail, tone = 'neutral', cta, className }: MetricTileProps) {
  return (
    <article className={`min-w-0 px-4 py-3.5 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColors[tone]}`}
          aria-hidden="true"
        />
        <p className="text-[12px] font-medium text-[#73736e]">{title}</p>
      </div>
      <p className="mt-1.5 text-[28px] font-semibold leading-8 tabular-nums tracking-[-0.02em] text-[#252522]">{value}</p>
      <p className="mt-1 text-[12px] leading-5 text-[#73736e]">{detail}</p>
      {cta ? (
        cta.href.startsWith('/') ? (
          <Link to={cta.href} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#176b5c] underline-offset-4 hover:underline">
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <a href={cta.href} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#176b5c] underline-offset-4 hover:underline">
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )
      ) : null}
    </article>
  );
}
