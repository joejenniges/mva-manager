import { useState, lazy, Suspense } from "react";

// WHY: Lazy-load MapView so Leaflet's CSS/JS doesn't bloat the initial bundle
const MapView = lazy(() => import("./MapView"));

interface Props {
  lat: number;
  lng: number;
  label: string;
}

export default function CollapsibleMap({ lat, lng, label }: Props) {
  const [expanded, setExpanded] = useState(false);
  // WHY: Track if map was ever shown so we can use CSS hidden instead of
  // unmounting. Once Leaflet loads tiles, toggling off shouldn't discard them.
  const [hasExpanded, setHasExpanded] = useState(false);

  function toggle() {
    if (!expanded && !hasExpanded) setHasExpanded(true);
    setExpanded((v) => !v);
  }

  function navigate() {
    // WHY: geo: URI on Android triggers the OS app picker (Google Maps, Waze,
    // etc.) instead of forcing one app. Apple doesn't handle geo: URIs, so we
    // use maps: which opens Apple Maps (or the user's default maps app on iOS 18+).
    const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
    const url = isApple
      ? `maps://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(label)}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`;
    window.open(url, "_blank");
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        {expanded ? "Hide Map" : "Show Map"}
      </button>

      {hasExpanded && (
        <div className={expanded ? "mt-2" : "hidden"}>
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-gray-800" />}>
            <MapView locations={[{ lat, lng, label }]} />
          </Suspense>
          <div className="mt-2 flex justify-end">
            <button
              onClick={navigate}
              className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
            >
              Navigate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
