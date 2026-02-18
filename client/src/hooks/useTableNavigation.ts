import { useState, useEffect } from "react";

interface UseTableNavigationOpts {
  itemCount: number;
  onSelect: (index: number) => void;
}

export default function useTableNavigation({ itemCount, onSelect }: UseTableNavigationOpts) {
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset selection when data changes (new search results, page change)
  useEffect(() => {
    setSelectedIndex(-1);
  }, [itemCount]);

  // Scroll selected row into view
  useEffect(() => {
    if (selectedIndex < 0) return;
    const row = document.querySelector(`[data-row-index="${selectedIndex}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const hotkeys: Record<string, (e: KeyboardEvent) => void> = {
    ArrowDown: () => {
      if (itemCount === 0) return;
      setSelectedIndex((i) => (i < 0 ? 0 : Math.min(i + 1, itemCount - 1)));
    },
    ArrowUp: () => {
      if (itemCount === 0) return;
      setSelectedIndex((i) => (i <= 0 ? -1 : i - 1));
    },
    Enter: () => {
      if (selectedIndex >= 0) onSelect(selectedIndex);
    },
  };

  return { selectedIndex, setSelectedIndex, hotkeys };
}
