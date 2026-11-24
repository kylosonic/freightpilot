'use client';

import { useState } from 'react';
import { Minus, Plus, Route, UploadCloud, UserPlus } from 'lucide-react';

import {
  hideLabel,
  howItWorksHeading,
  howItWorksSteps,
  showLabel,
} from '@/lib/site-content';

const stepIcons = [UserPlus, Route, UploadCloud];

/**
 * Collapsed-by-default "How it works" section (NB-38).
 *
 * Expansion is a CSS grid-rows reveal (`how-it-works-reveal` keyframe in
 * globals.css) — deliberately NOT framer-motion, so the home page keeps its
 * single allowed entrance animation (the hero `m.h1`).
 */
export function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <section className="section-shell scroll-mt-24 pt-16 sm:pt-20" data-section="how-it-works" id="how-it-works">
      <div className="mx-auto max-w-[980px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="site-heading max-w-[24ch]">
            {howItWorksHeading}
          </h2>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="how-it-works-steps"
            className="site-action-secondary self-start sm:self-auto"
          >
            {open ? <Minus className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {open ? hideLabel : showLabel}
          </button>
        </div>

        {open ? (
          <div className="how-it-works-reveal mt-8">
            <ol id="how-it-works-steps" className="min-h-0 space-y-4 overflow-hidden" role="list">
              {howItWorksSteps.map((step, index) => {
                const Icon = stepIcons[index % stepIcons.length];
                return (
                  <li
                    key={step}
                    className="flex items-start gap-4 border-t border-[#efeeea] py-4 first:border-t-0"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#f5f5f2]">
                      <Icon className="h-4 w-4 text-[#087f72]" aria-hidden="true" />
                    </span>
                    <span className="text-[15px] leading-7 text-[#5f5f59]">{step}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
    </section>
  );
}
