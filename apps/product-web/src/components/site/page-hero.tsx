import type { ReactNode } from 'react';

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, description, actions, aside }: PageHeroProps) {
  return (
    <section className="section-shell pt-8 sm:pt-12">
      <div className="grid grid-cols-1 gap-6 border-b border-[#d7dfdc] pb-8 sm:gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:pb-10">
        <div className="space-y-4 sm:space-y-5">
          <p className="kicker">{eyebrow}</p>
          <h1 className="balanced-headline max-w-[17ch] font-display text-[clamp(2.25rem,4.5vw,4.1rem)] font-semibold leading-[1.02] text-[#172a24]">{title}</h1>
          <p className="lede text-[0.98rem] sm:text-base">{description}</p>
          {actions ? <div className="flex flex-col items-stretch gap-3 pt-3 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
        </div>
        {aside ? <div className="relative min-w-0 lg:pt-2">{aside}</div> : null}
      </div>
    </section>
  );
}
