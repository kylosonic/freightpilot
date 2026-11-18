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
    <section className="section-shell pt-14 sm:pt-20" data-section="how-it-works">
      <div className="border-y border-[#d7dfdc] py-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="max-w-[24ch] font-display text-[clamp(1.75rem,3.4vw,2.7rem)] font-semibold leading-[1.08] text-[#172a24]">
            {howItWorksHeading}
          </h2>
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="how-it-works-steps"
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start border border-[#cfd9d5] bg-white px-4 text-sm font-semibold text-[#40534c] transition hover:bg-[#eef3f0] sm:self-auto"
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
                    className="flex items-start gap-4 border-t border-[#e2e8e5] py-4 first:border-t-0"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[#d7dfdc] bg-[#f5f8f6]">
                      <Icon className="h-4 w-4 text-[#087f72]" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-7 text-[#40534c] sm:text-base">{step}</span>
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
