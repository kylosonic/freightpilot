import { cn } from '@/lib/cn';

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
};

export function SectionHeading({ eyebrow, title, description, align = 'left' }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-[50rem] space-y-4', align === 'center' ? 'mx-auto text-center [&>h2]:mx-auto [&>p]:mx-auto' : '')}>
      <p className="kicker">{eyebrow}</p>
      <h2 className="balanced-headline max-w-[26ch] font-display text-[clamp(1.75rem,3.2vw,2.7rem)] font-semibold leading-[1.08] text-[#172a24]">{title}</h2>
      <p className="max-w-[42rem] text-sm leading-7 text-[#5b6d66] sm:text-base sm:leading-8">{description}</p>
    </div>
  );
}
