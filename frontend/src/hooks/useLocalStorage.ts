"use client";

import { useState, useCallback } from "react";

/**
 * Persist state in localStorage with SSR-safe fallback.
 *
 * Usage:
 *   const [theme, setTheme] = useLocalStorage("pnpi-theme", "light");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          /* quota exceeded or private browsing */
        }
        return nextValue;
      });
    },
    [key],
  );

  return [storedValue, setValue];
}
