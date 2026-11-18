'use client';

import type { PropsWithChildren } from 'react';
import { m, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/cn';

type MotionSectionProps = PropsWithChildren<{
  className?: string;
  delay?: number;
}>;

export function MotionSection({ children, className, delay = 0 }: MotionSectionProps) {
  const reduceMotion = useReducedMotion();
  const classes = cn('min-w-0', className);

  if (reduceMotion) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <m.section
      className={classes}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </m.section>
  );
}
