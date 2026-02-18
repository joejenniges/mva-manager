import Geocodio from "geocodio-library-node";
import { config } from "../config.js";
import { logger } from "../logger.js";

// WHY: Singleton - Geocodio client is stateless, no reason to create per-request
const geocoder = config.geocodioApiKey ? new Geocodio(config.geocodioApiKey) : null;

export async function geocodeAddress(address: string, city?: string, state?: string, zip?: string): Promise<{ lat: string; lng: string } | null> {
  if (!geocoder) {
    logger.warn("Geocodio API key not configured, skipping geocoding");
    return null;
  }

  const parts = [address, city, state, zip].filter(Boolean).join(", ");
  if (!parts) return null;

  try {
    const response = await geocoder.geocode(parts);
    const results = response?.results;
    if (!results?.length) return null;

    const { lat, lng } = results[0].location;
    return { lat: String(lat), lng: String(lng) };
  } catch (err) {
    logger.error({ err }, "Geocoding failed");
    return null;
  }
}

