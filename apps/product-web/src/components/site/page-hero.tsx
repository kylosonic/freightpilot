import { cn } from '@/lib/cn';
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
    <section className="section-shell pt-12 sm:pt-16">
      <div
        className={cn(
          'grid grid-cols-1 gap-8 pb-8 sm:gap-12 lg:items-start lg:pb-10',
          aside ? 'lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]' : '',
        )}
      >
        <div className="space-y-4">
          <p className="kicker">{eyebrow}</p>
          <h1 className="balanced-headline max-w-[19ch] font-display text-[clamp(2.4rem,4.7vw,4.4rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-[#252522]">{title}</h1>
          <p className="lede max-w-[600px] text-[16px] leading-7">{description}</p>
          {actions ? <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center [&>*]:w-full sm:[&>*]:w-auto">{actions}</div> : null}
        </div>
        {aside ? <div className="relative min-w-0 lg:mt-7">{aside}</div> : null}
      </div>
    </section>
  );
}
