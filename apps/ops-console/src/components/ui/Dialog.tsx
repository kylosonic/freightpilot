import { useEffect, useId } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

type DialogProps = PropsWithChildren<{
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
  bodyClassName?: string;
}>;

function joinClasses(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

/**
 * Shared presentation-only modal primitive: fixed overlay + border-first
 * frame with optional eyebrow/title/description/actions scaffolding.
 * Supports Escape-key dismissal when `onClose` is provided.
 */
export function Dialog({ eyebrow, title, description, actions, onClose, className, bodyClassName, children }: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!onClose) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fp-dialog-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={joinClasses('fp-dialog-surface', className)}
      >
        {eyebrow ? <p className="text-[12px] font-medium text-[#73736e]">{eyebrow}</p> : null}
        {title ? <h3 id={titleId} className="mt-1 text-lg font-semibold text-[#252522]">{title}</h3> : null}
        {description ? <p className="mt-1.5 text-sm leading-6 text-[#5f5f59]">{description}</p> : null}
        <div className={joinClasses(title || description ? 'mt-4' : '', bodyClassName)}>{children}</div>
        {actions ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
