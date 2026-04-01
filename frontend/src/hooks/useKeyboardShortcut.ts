"use client";

import { useEffect, useCallback } from "react";

interface ShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
  /** Only fire when no input/textarea is focused */
  ignoreInputs?: boolean;
}

/**
 * Register a keyboard shortcut.
 *
 * Usage:
 *   useKeyboardShortcut("k", () => openSearch(), { ctrl: true });
 *   useKeyboardShortcut("Escape", () => closeModal());
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: ShortcutOptions = {},
) {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    preventDefault = true,
    ignoreInputs = true,
  } = options;

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Check modifiers
      if (ctrl && !(e.ctrlKey || e.metaKey)) return;
      if (shift && !e.shiftKey) return;
      if (alt && !e.altKey) return;
      if (!ctrl && (e.ctrlKey || e.metaKey)) return;

      // Check key
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      // Ignore when typing in inputs
      if (ignoreInputs) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if ((e.target as HTMLElement)?.isContentEditable) return;
      }

      if (preventDefault) e.preventDefault();
      callback();
    },
    [key, ctrl, shift, alt, preventDefault, ignoreInputs, callback],
  );

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);
}
