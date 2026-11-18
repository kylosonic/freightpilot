import type { PropsWithChildren, ReactNode } from 'react';

type PanelProps = PropsWithChildren<{
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

export function Panel({ eyebrow, title, description, actions, className, bodyClassName, children }: PanelProps) {
  const hasHeader = eyebrow || title || description || actions;

  return (
    <section
      className={joinClasses(
        'overflow-hidden border border-[#d7dfdc] bg-white',
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2e8e5] px-4 py-3">
          <div className="max-w-3xl space-y-0.5">
            {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6b7d76]">{eyebrow}</p> : null}
            {title ? <h2 className="text-[15px] font-semibold leading-5 text-[#20372f]">{title}</h2> : null}
            {description ? <p className="text-xs leading-5 text-[#63766f]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </header>
      ) : null}

      <div className={joinClasses('px-4 py-4', bodyClassName)}>{children}</div>
    </section>
  );
}
