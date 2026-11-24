'use client';

import Link from 'next/link';
import type { PropsWithChildren } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/cn';

type MagneticLinkProps = PropsWithChildren<{
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  showIcon?: boolean;
  external?: boolean;
}>;

const variantClasses: Record<NonNullable<MagneticLinkProps['variant']>, string> = {
  primary:
    'rounded-full bg-[#087f72] text-white transition-colors hover:bg-[#176b5c]',
  secondary:
    'rounded-full border border-[#e5e4e0] bg-white text-[#454540] transition-colors hover:border-[#d7d6d1] hover:bg-[#f7f7f5]',
  ghost: 'rounded-full bg-transparent text-[#454540] hover:bg-[#f4f4f1] hover:text-[#252522]',
};

function LinkContent({
  children,
  showIcon = true,
  external = false,
}: Pick<MagneticLinkProps, 'showIcon' | 'external'> & PropsWithChildren) {
  return (
    <span className="relative z-10 flex items-center justify-center gap-2 text-center sm:text-left">
      {children}
      {external ? <span className="sr-only"> (opens in new tab)</span> : null}
      {showIcon ? (
        external ? (
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        ) : (
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        )
      ) : null}
    </span>
  );
}

function AnchorShell({
  children,
  href,
  external,
  className,
  variant = 'primary',
  showIcon = true,
}: PropsWithChildren<MagneticLinkProps>) {
  const content = <LinkContent showIcon={showIcon} external={external}>{children}</LinkContent>;
  const sharedClassName = cn(
    'group inline-flex min-h-10 min-w-0 items-center justify-center px-4 text-sm font-medium transition-colors sm:px-5',
    variantClasses[variant],
    className,
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={sharedClassName}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={false} className={sharedClassName}>
      {content}
    </Link>
  );
}

export function MagneticLink({ href, external, ...props }: MagneticLinkProps) {
  const isExternal = external ?? href.startsWith('http');

  return <AnchorShell href={href} external={isExternal} {...props} />;
}
