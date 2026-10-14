import type { ReactNode } from "react";

/** A page's title: 30px, bold, tightly tracked — the "Plans" heading in the mockup. */
export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-sans text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-bo-ink">
        {children}
      </h1>
      {subtitle && <p className="m-0 font-sans text-sm leading-[1.45] text-bo-muted">{subtitle}</p>}
    </div>
  );
}

/**
 * A section's heading row — title, optional inline badge, one line of
 * description, and the section's buttons on the right ("Stripe Products"
 * with its SYNCED badge and the two pill buttons, in the mockup).
 */
export function SectionHeader({
  title,
  badge,
  description,
  actions,
}: {
  title: string;
  badge?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-[7px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="m-0 font-sans text-lg leading-[1.2] font-semibold tracking-[-0.01em] text-bo-ink">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="m-0 font-sans text-sm leading-[1.45] text-bo-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

/** A content card from the Admin screens ("Verification queue"): white, hairline border, 14px radius, 20px padding. */
export function Card({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  /** Right-aligned beside the title — a pill, a count. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`box-border flex flex-col gap-[13px] rounded-[14px] border border-bo-card-border bg-bo-paper p-5 ${className}`}
    >
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3">
          {title && (
            <h3 className="m-0 font-sans text-sm leading-none font-semibold text-bo-ink">
              {title}
            </h3>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** The dashed placeholder the mockup uses for a section with nothing in it yet. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-bo-input-border-hover px-6 py-12 text-center">
      <span className="font-sans text-sm leading-[1.45] font-medium text-bo-muted">{children}</span>
      {action}
    </div>
  );
}

/** A red line for a failed request, placed above whatever it concerns. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-xl border border-bo-danger-bg bg-bo-danger-bg px-3.5 py-2.5 font-sans text-[13px] leading-[1.45] font-medium text-bo-danger"
    >
      {children}
    </p>
  );
}
