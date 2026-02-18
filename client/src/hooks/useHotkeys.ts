import { useEffect, useRef } from "react";

type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export default function useHotkeys(keymap: HotkeyMap): void {
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // If a component already handled this event (e.g. EntityPicker closing
      // its dropdown on Escape), don't also fire the page-level handler.
      if (e.defaultPrevented) return;

      // Let browser shortcuts (Ctrl+S, Cmd+C, etc.) pass through
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const active = document.activeElement;
      const inInput =
        active &&
        (INPUT_TAGS.has(active.tagName) ||
          (active as HTMLElement).isContentEditable);

      const fn = keymapRef.current[e.key];
      if (!fn) return;

      // Escape always fires everywhere.
      // Arrows and Enter pass through for <input> only (no useful native behavior
      // in single-line inputs). Suppressed in <select> (arrows cycle options),
      // <textarea> (arrows move between lines), and contentEditable.
      if (inInput) {
        if (e.key === "Escape") { /* always allowed */ }
        else if (
          (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") &&
          active?.tagName === "INPUT"
        ) { /* allowed for single-line inputs */ }
        else return;
      }

      e.preventDefault();
      fn(e);
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
