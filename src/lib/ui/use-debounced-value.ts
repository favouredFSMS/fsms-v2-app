"use client";

import { useEffect, useState } from "react";

/**
 * FSMS V2 — debounced value hook (search / filter inputs).
 *
 * Returns the input value immediately, and a debounced copy that only updates
 * after `delayMs` of quiet. Debounced search keeps keystrokes cheap and
 * backend queries minimal (performance guardrail).
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}
