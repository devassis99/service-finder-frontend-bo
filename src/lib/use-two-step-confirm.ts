import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The mockup's destructive-action pattern, as a hook: the first click on
 * "Delete" arms that one row (its button becomes a red "Confirm delete"
 * pill), a second click within `windowMs` carries it out, and doing
 * nothing disarms it again. One row armed at a time.
 *
 *   const confirm = useTwoStepConfirm();
 *   onClick={() => confirm.ask(row.id) && remove(row.id)}
 *   confirm.isArmed(row.id) ? <ConfirmPill/> : <DeleteLink/>
 */
export function useTwoStepConfirm(windowMs = 3000) {
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  /** True when this click is the confirming one; otherwise arms `id` and answers false. */
  const ask = useCallback(
    (id: string): boolean => {
      clearTimeout(timer.current);
      if (armed === id) {
        setArmed(null);
        return true;
      }
      setArmed(id);
      timer.current = setTimeout(() => setArmed(null), windowMs);
      return false;
    },
    [armed, windowMs],
  );

  const isArmed = useCallback((id: string) => armed === id, [armed]);

  return { ask, isArmed };
}
