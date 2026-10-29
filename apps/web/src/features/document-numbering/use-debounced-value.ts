import { useEffect, useState } from "react";

/** Nilai yang baru berubah setelah `delayMs` tanpa perubahan, agar pratinjau tidak dipanggil per ketukan. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
