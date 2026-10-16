import type { ReactNode, SelectHTMLAttributes } from "react";

/**
 * A labelled form control. The label is the mockups' mono caps, the same
 * voice as a table header, so a form reads as part of the same system.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10.5px] leading-none font-medium tracking-[0.07em] text-bo-faint uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="font-sans text-xs leading-snug text-bo-muted">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full box-border rounded-xl border border-bo-input-border bg-bo-paper px-3.5 font-sans text-sm text-bo-ink outline-none placeholder:text-bo-faint hover:border-bo-input-border-hover focus:border-bo-accent focus:shadow-[0_0_0_1px_var(--color-bo-accent)]";

/** Text inputs and textareas: white, hairline border, 12px radius, teal focus ring like the code boxes. */
export const formInputClass = `${inputBase} py-3`;

/**
 * The same input at a Select's 40px height, for one sitting beside a
 * Select on the same line. A separate class rather than an override: two
 * utilities for the same property (py-3 and h-10's partner py-0) don't
 * resolve by the order they're written in.
 */
export const formInputCompactClass = `${inputBase} h-10`;

const SELECT_SIZES = {
  md: "h-10 pl-3.5 pr-[38px] text-[13px]",
  sm: "h-9 pl-3 pr-[34px] text-[13px]",
} as const;

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  /** "sm" inside table rows; not the native `size` attribute, which turns a select into a list box. */
  size?: keyof typeof SELECT_SIZES;
  /** Stretch to the container (form fields); otherwise size to content (filters, table cells). */
  block?: boolean;
}

/**
 * The mockup's select: the native control with its arrow removed and a
 * drawn chevron in its place, so it looks the same in every browser while
 * keeping native keyboard and screen-reader behaviour.
 */
export function Select({
  size = "md",
  block = false,
  className = "",
  children,
  ...rest
}: SelectProps) {
  return (
    <span className={`relative ${block ? "flex w-full" : "inline-flex"}`}>
      <select
        className={`w-full cursor-pointer appearance-none rounded-xl border border-bo-input-border bg-bo-paper font-sans font-medium text-bo-ink outline-none hover:border-bo-input-border-hover focus:border-bo-accent disabled:cursor-not-allowed disabled:bg-bo-hover disabled:text-bo-faint ${SELECT_SIZES[size]} ${className}`}
        {...rest}
      >
        {children}
      </select>
      <svg
        width="12"
        height="8"
        viewBox="0 0 12 8"
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2"
      >
        <path
          d="M1 1.5l5 5 5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-bo-muted"
        />
      </svg>
    </span>
  );
}

export default Field;
