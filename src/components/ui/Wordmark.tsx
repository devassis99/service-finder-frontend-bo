const SIZES = {
  /** Login card header. */
  lg: { name: "text-[36px]", tag: "text-[11px]", gap: "gap-2.5" },
  /** Sidebar. */
  md: { name: "text-[22px]", tag: "text-[10px]", gap: "gap-2" },
} as const;

/**
 * "ServiceFinder" in heavy, tightly tracked Libre Franklin, with
 * "BACKOFFICE" set beside it in small, widely tracked teal Roboto Mono —
 * the lock-up every screen of the mockup opens with.
 */
export function Wordmark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  return (
    <span className={`flex items-baseline ${s.gap}`}>
      <span className={`font-sans font-bold leading-none tracking-[-0.04em] text-bo-ink ${s.name}`}>
        ServiceFinder
      </span>
      <span
        className={`font-mono font-medium leading-none uppercase tracking-[0.14em] text-bo-accent ${s.tag}`}
      >
        Backoffice
      </span>
    </span>
  );
}

export default Wordmark;
