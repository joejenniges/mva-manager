import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// WHY: Leaflet's default marker icons break with Vite because Leaflet's
// _getIconUrl method resolves icon paths via CSS url(), which doesn't work
// with bundled assets. Deleting _getIconUrl forces Leaflet to use the
// options we set via mergeOptions (Vite-resolved asset URLs) instead.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface Props {
  locations: MapLocation[];
  zoom?: number;
  className?: string;
}

export default function MapView({ locations, zoom = 14, className = "h-64 w-full rounded-lg" }: Props) {
  if (locations.length === 0) return null;

  const center: [number, number] = [locations[0].lat, locations[0].lng];

  // WHY: CartoDB dark tiles match the app's dark theme
  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';

  // WHY: Leaflet sets z-index up to 1000 on its controls/attribution, which
  // bleeds above position:fixed modals (z-50) on the same page. The relative
  // z-0 wrapper creates a stacking context that contains all internal z-indices.
  return (
    <div className="relative z-0">
      <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom={false}>
        <TileLayer url={tileUrl} attribution={attribution} />
        {locations.map((loc, i) => (
          <Marker key={i} position={[loc.lat, loc.lng]}>
            {loc.label && <Popup>{loc.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
