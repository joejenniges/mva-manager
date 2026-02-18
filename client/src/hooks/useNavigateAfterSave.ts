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
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      navigateRef.current(target);
    }
  }, [target]);

  return setTarget;
}
