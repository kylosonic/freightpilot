import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Panel } from './ui/Panel';
import type { ForecastPoint, ForecastQuality } from '../types/api';

type Props = {
  points: ForecastPoint[];
  quality?: ForecastQuality | null;
  modelName?: string;
};

const axisStyle = { fill: '#63766f', fontSize: 11 };
const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #d7dfdc',
  borderRadius: '4px',
  color: '#20372f',
};

export function ForecastChart({ points, quality, modelName }: Props) {
  const grouped = new Map<
    string,
    { predicted_total_demand: number; planning_low: number; planning_high: number }
  >();
  points.forEach((point) => {
    const key = point.week_start;
    const current = grouped.get(key) ?? {
      predicted_total_demand: 0,
      planning_low: 0,
      planning_high: 0,
    };
    grouped.set(key, {
      predicted_total_demand: current.predicted_total_demand + point.predicted_demand,
      planning_low: current.planning_low + point.planning_low,
      planning_high: current.planning_high + point.planning_high,
    });
  });

  const data = Array.from(grouped.entries())
    .map(([week_start, totals]) => ({ week_start, ...totals }))
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  const backtestLabel = quality?.wape_percent != null ? `${quality.wape_percent}% WAPE` : 'Not available';
  const hasHighError = quality?.wape_percent != null && quality.wape_percent > 35;
  const qualityTone =
    hasHighError || quality?.status === 'limited'
      ? 'border-[#e7d1a8] bg-[#fffaf0] text-[#704500]'
      : quality?.status === 'validated'
        ? 'border-[#b9dcd1] bg-[#edf8f3] text-[#14745f]'
        : 'border-[#d7dfdc] bg-[#f5f8f6] text-[#40534c]';
  const evidenceLabel = quality
    ? `${quality.status.split('_').join(' ')}${hasHighError ? ' - high error' : ''}`
    : 'Unavailable';
  const widensByBacktest = quality?.range_basis.includes('holdout_error') ?? false;

  return (
    <Panel
      eyebrow="Demand intelligence"
      title="Predicted Weekly Demand"
      description="Point demand, a planning range derived from the available model evidence, and the limits behind the output."
    >
      <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[#d7dfdc] bg-[#f8faf9] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Model</p>
          <p className="mt-1 text-xs font-semibold text-[#20372f]">{modelName ?? 'Demand model'}</p>
        </div>
        <div className="border border-[#d7dfdc] bg-[#f8faf9] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Backtest error</p>
          <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[#20372f]">{backtestLabel}</p>
        </div>
        <div className="border border-[#d7dfdc] bg-[#f8faf9] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-[#6b7d76]">Demand history</p>
          <p className="mt-1 font-mono text-xs font-semibold tabular-nums text-[#20372f]">
            {quality ? `${quality.history_weeks} wk` : 'Unknown'}
          </p>
        </div>
        <div className={`border px-3 py-2 ${qualityTone}`}>
          <p className="text-[10px] uppercase tracking-wide opacity-70">Forecast evidence</p>
          <p className="mt-1 text-xs font-semibold capitalize">{evidenceLabel}</p>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <defs>
              <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#087f72" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#087f72" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e6ebe8" strokeDasharray="2 3" />
            <XAxis dataKey="week_start" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#a9bbb4' }} />
            <Legend wrapperStyle={{ color: '#40534c', fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="planning_low"
              name="Planning low"
              stroke="#a15b00"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="planning_high"
              name="Planning high"
              stroke="#a15b00"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              animationDuration={900}
            />
            <Line
              type="monotone"
              dataKey="predicted_total_demand"
              name="Predicted demand"
              stroke="#087f72"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#087f72', stroke: '#ffffff', strokeWidth: 2 }}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {quality ? (
        <div className="mt-3 border-t border-[#e6ebe8] pt-2.5">
          <p className="text-xs leading-5 text-[#40534c]">{quality.interpretation}</p>
          <p className="mt-1 text-[11px] leading-5 text-[#63766f]">{quality.caveat}</p>
          <p className="mt-1 text-[11px] leading-5 text-[#63766f]">
            {widensByBacktest
              ? 'Planning range widens the trend residual band by held-out error; it is not a guarantee.'
              : 'Planning range reflects the trend residual band only; no held-out error estimate was available.'}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}
