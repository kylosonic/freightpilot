'use client';

import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';

import type { FaqItem } from '@/lib/site-content';

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="border-t border-[#d7dfdc]" role="list">
      {items.map((item, index) => {
        const open = openIndex === index;
        const answerId = `faq-answer-${index}`;

        return (
          <article key={item.question} className="overflow-hidden border-b border-[#d7dfdc] bg-white" role="listitem">
            <h4 className="m-0">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? -1 : index)}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-4 text-left"
                aria-expanded={open}
                aria-controls={answerId}
              >
                <span className="text-pretty pr-2 text-sm font-semibold text-[#172a24]">{item.question}</span>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[#d7dfdc] bg-[#f8faf9] text-[#40534c]">
                  {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
            </h4>
            <AnimatePresence initial={false}>
              {open ? (
                <m.div
                  id={answerId}
                  role="region"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="px-4 pb-4 text-sm leading-7 text-[#5b6d66]">{item.answer}</p>
                </m.div>
              ) : null}
            </AnimatePresence>
          </article>
        );
      })}
    </div>
  );
}
