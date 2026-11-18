import { cn } from '@/lib/cn';

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'left' | 'center';
};

export function SectionHeading({ eyebrow, title, description, align = 'left' }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-[50rem] space-y-3', align === 'center' ? 'mx-auto text-center [&>h2]:mx-auto [&>p]:mx-auto' : '')}>
      <p className="kicker">{eyebrow}</p>
      <h2 className="site-heading max-w-[26ch]">{title}</h2>
      <p className="max-w-[42rem] text-[15px] leading-7 text-[#73736e]">{description}</p>
    </div>
  );
}
