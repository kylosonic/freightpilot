import type { PropsWithChildren, ReactNode } from 'react';

type DialogProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
}>;

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/**
 * Shared presentation-only modal primitive: fixed overlay + border-first
 * frame with optional eyebrow/title/description/actions scaffolding.
 *
 * Deliberately adds no focus trap, no Escape handling, and no backdrop-click
 * close — those would be new handlers and are page-level behaviors.
 * Semantic tone (e.g. a rose danger frame) is passed through the className
 * seam rather than by forking the frame.
 */
export function Dialog({ eyebrow, title, description, actions, className, bodyClassName, children }: DialogProps) {
  return (
    <div className="fp-dialog-overlay">
      <div role="dialog" className={joinClasses('fp-dialog-surface', className)}>
        {eyebrow ? <p className="text-[12px] font-medium text-[#85857e]">{eyebrow}</p> : null}
        {title ? <h3 className="mt-1 text-lg font-semibold text-[#252522]">{title}</h3> : null}
        {description ? <p className="mt-1.5 text-sm leading-6 text-[#73736e]">{description}</p> : null}
        <div className={joinClasses(title || description ? 'mt-4' : '', bodyClassName)}>{children}</div>
        {actions ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
