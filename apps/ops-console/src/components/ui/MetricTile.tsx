import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

type MetricTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

type MetricTileProps = {
  title: string;
  value: string | number;
  detail: string;
  tone?: MetricTone;
  cta?: { label: string; href: string };
};

const dotColors: Record<MetricTone, string> = {
  neutral: 'bg-[#71827b]',
  success: 'bg-[#16856b]',
  warning: 'bg-[#a15b00]',
  danger: 'bg-[#b93a36]',
  info: 'bg-[#17679b]',
};

export function MetricTile({ title, value, detail, tone = 'neutral', cta }: MetricTileProps) {
  return (
    <article className="min-w-0 border-b border-[#e2e8e5] bg-white px-4 py-3 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 ${dotColors[tone]}`}
          aria-hidden="true"
        />
        <p className="text-xs font-medium text-[#63766f]">{title}</p>
      </div>
      <p className="mt-1.5 font-mono text-[25px] font-medium leading-7 tabular-nums text-[#172a24]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#63766f]">{detail}</p>
      {cta ? (
        cta.href.startsWith('/') ? (
          <Link to={cta.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <a href={cta.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#087f72] underline-offset-4 hover:underline">
            {cta.label}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )
      ) : null}
    </article>
  );
}
