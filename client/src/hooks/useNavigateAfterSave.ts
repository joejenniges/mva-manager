import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// WHY: React Router v7's useNavigate has an activeRef guard that can silently
// drop navigate() calls made from async handlers (after await). By deferring
// navigation to a useEffect, we guarantee it runs after the layout effect
// that sets activeRef = true.
//
// WHY useRef for navigate: React Router v7 recreates the navigate function when
// the location changes (it depends on routePathnamesJson internally). If we put
// navigate in the effect's dependency array, the effect re-fires every time the
// location changes - creating a feedback loop that locks the router on the
// target URL and fights all subsequent navigation.
export function useNavigateAfterSave() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [target, setTarget] = useState<{ path: string; replace?: boolean } | { delta: number } | null>(null);

  useEffect(() => {
    if (target) {
      if ("delta" in target) {
        navigateRef.current(target.delta);
      } else {
        navigateRef.current(target.path, { replace: target.replace });
      }
    }
  }, [target]);

  function navigateTo(path: string, opts?: { replace?: boolean }): void;
  function navigateTo(delta: number): void;
  function navigateTo(pathOrDelta: string | number, opts?: { replace?: boolean }) {
    if (typeof pathOrDelta === "number") {
      setTarget({ delta: pathOrDelta });
    } else {
      setTarget({ path: pathOrDelta, replace: opts?.replace });
    }
  }

  return navigateTo;
}
