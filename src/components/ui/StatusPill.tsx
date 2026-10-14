import type { ReactNode } from "react";

/** Colour pairs from the mockups' status pills (ACTIVE, PENDING LICENSE, DOCS EXPIRING, SUSPENDED, ARCHIVED). */
const TONE_CLASSES = {
  success: "bg-bo-accent-bg text-bo-accent-deep",
  pending: "bg-bo-neutral-bg text-bo-ink",
  neutral: "bg-bo-neutral-bg text-bo-muted",
  warning: "bg-bo-warning-bg text-bo-warning",
  danger: "bg-bo-danger-bg text-bo-danger",
} as const;

export type PillTone = keyof typeof TONE_CLASSES;

interface StatusPillProps {
  tone: PillTone;
  children: ReactNode;
}

/** The small, uppercase, monospaced status badge used in every table. */
export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full px-[9px] py-1.5 font-mono text-[10px] leading-none font-medium tracking-[0.05em] uppercase ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export default StatusPill;
