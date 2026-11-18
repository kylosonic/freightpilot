import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-2">
      <div className="min-w-0 max-w-[760px]">
        {eyebrow ? <p className="mb-1 text-[12px] font-medium text-[#73736e]">{eyebrow}</p> : null}
        <h1 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-semibold leading-[1.2] tracking-[-0.02em] text-[#252522]">
          {title}
        </h1>
        <p className="mt-1.5 max-w-[760px] text-[14px] leading-6 text-[#73736e]">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
