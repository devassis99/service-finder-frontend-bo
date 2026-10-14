import type { CSSProperties, ReactNode } from "react";

/**
 * The mockup's tables, built from CSS grid rows rather than <table> so a
 * row can hold a select, pills and a cluster of actions without fighting
 * table layout. Every row shares one `columns` template
 * (grid-template-columns), passed to both the head and each row.
 *
 * White card, 16px radius, a faint shadow; a mono caps header on the
 * warmer table-head tint; 60px rows split by the lightest rule, warming
 * slightly on hover.
 */
export function DataTable({ minWidth, children }: { minWidth?: number; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-bo-card-border bg-bo-paper shadow-table">
      <div style={minWidth ? { minWidth } : undefined}>{children}</div>
    </div>
  );
}

export function DataTableHead({ columns, labels }: { columns: string; labels: string[] }) {
  return (
    <div
      className="grid items-center gap-3 border-b border-bo-divider bg-bo-table-head px-[22px] py-3.5 font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] text-bo-faint uppercase"
      style={{ gridTemplateColumns: columns } as CSSProperties}
    >
      {labels.map((label, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- header cells are static and may repeat ""
        <span key={`${label}-${i}`}>{label}</span>
      ))}
    </div>
  );
}

export function DataTableRow({ columns, children }: { columns: string; children: ReactNode }) {
  return (
    <div
      className="grid min-h-[60px] items-center gap-3 border-t border-bo-row-divider px-[22px] py-2 font-sans text-sm leading-tight text-bo-ink first-of-type:border-t-0 hover:bg-bo-surface"
      style={{ gridTemplateColumns: columns } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** A one-line state inside the table body: loading, an error, nothing here yet. */
export function DataTableMessage({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "danger";
  children: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2.5 px-[22px] py-10 text-center font-sans text-sm font-medium ${
        tone === "danger" ? "text-bo-danger" : "text-bo-muted"
      }`}
    >
      {children}
    </div>
  );
}
