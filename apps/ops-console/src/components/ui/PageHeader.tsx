import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[#d7dfdc] pb-4">
      <div className="min-w-0 max-w-[760px]">
        {eyebrow ? <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#087f72]">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.45rem,2.2vw,1.9rem)] font-semibold leading-tight text-[#172a24]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-[760px] text-sm leading-6 text-[#5b6d66]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
