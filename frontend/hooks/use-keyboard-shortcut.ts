import { useEffect, useCallback } from "react";

interface ShortcutOptions {
  meta?: boolean;   // ⌘ on Mac, Win key on Windows
  ctrl?: boolean;   // Ctrl
  shift?: boolean;
  alt?: boolean;
  /** Skip when focus is inside an input/textarea/contenteditable (default: true) */
  ignoreInputs?: boolean;
}

/**
 * Registers a global keydown listener for the given key combination.
 * Automatically cleans up on unmount.
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: ShortcutOptions = {},
) {
  const {
    meta = false,
    ctrl = false,
    shift = false,
    alt = false,
    ignoreInputs = true,
  } = options;

  const stableHandler = useCallback(() => handler(), [handler]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (ignoreInputs) {
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const metaMatch  = meta  ? e.metaKey  : !e.metaKey;
      const ctrlMatch  = ctrl  ? e.ctrlKey  : !e.ctrlKey;
      const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
      const altMatch   = alt   ? e.altKey   : !e.altKey;

      if (
        metaMatch &&
        ctrlMatch &&
        shiftMatch &&
        altMatch &&
        e.key.toLowerCase() === key.toLowerCase()
      ) {
        e.preventDefault();
        stableHandler();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, meta, ctrl, shift, alt, ignoreInputs, stableHandler]);
}
