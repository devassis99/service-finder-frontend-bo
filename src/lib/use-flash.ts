import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A short-lived "it worked" marker for one item at a time — the mockup's
 * "Copy" turning into "Copied" for a moment and back.
 *
 *   const copied = useFlash();
 *   copied.flash(row.id);
 *   copied.is(row.id) ? "Copied" : "Copy"
 */
export function useFlash(durationMs = 1600) {
  const [flashed, setFlashed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback(
    (id: string) => {
      clearTimeout(timer.current);
      setFlashed(id);
      timer.current = setTimeout(() => setFlashed(null), durationMs);
    },
    [durationMs],
  );

  const is = useCallback((id: string) => flashed === id, [flashed]);

  return { flash, is };
}
