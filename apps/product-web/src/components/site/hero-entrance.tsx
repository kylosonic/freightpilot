'use client';

import { m, useReducedMotion } from 'framer-motion';

import { heroHeadline } from '@/lib/site-content';

/**
 * The home page's single allowed entrance animation (NB-42.5 / blueprint
 * §1.3): a mount-time fade+rise on the hero headline. No whileInView, no
 * repeat. Extracted to a client component so the server page never touches
 * framer-motion's module proxy at prerender time.
 */
export function HeroEntrance() {
  const reduceMotion = useReducedMotion();

  return (
    <m.h1
      data-hero-entrance
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="balanced-headline mx-auto max-w-[900px] text-[clamp(2.6rem,6vw,5.3rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[#252522]"
    >
      {heroHeadline}
    </m.h1>
  );
}
