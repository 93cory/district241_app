"use client";

import { useState, useEffect } from "react";

/**
 * Debounce a value — useful for search inputs to avoid firing API calls on every keystroke.
 *
 * Usage:
 *   const [query, setQuery] = useState("");
 *   const debouncedQuery = useDebounce(query, 300);
 *   // Use debouncedQuery in your SWR/fetch call
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
