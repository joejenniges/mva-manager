#!/usr/bin/env bash
# Downloads and processes OpenStreetMap data for OSRM routing.
# Uses Geofabrik state-level extracts. Set OSRM_STATES env var to
# comma-separated 2-letter state codes (e.g. OSRM_STATES=MN,WI).

set -euo pipefail

OSRM_STATES="${OSRM_STATES:-MN}"
DATA_DIR="${DATA_DIR:-./osrm-data}"
PROFILE="/opt/car.lua"

# Map of state abbreviations to Geofabrik region names
declare -A STATE_MAP=(
  [AL]=alabama [AK]=alaska [AZ]=arizona [AR]=arkansas [CA]=california
  [CO]=colorado [CT]=connecticut [DE]=delaware [FL]=florida [GA]=georgia
  [HI]=hawaii [ID]=idaho [IL]=illinois [IN]=indiana [IA]=iowa
  [KS]=kansas [KY]=kentucky [LA]=louisiana [ME]=maine [MD]=maryland
  [MA]=massachusetts [MI]=michigan [MN]=minnesota [MS]=mississippi [MO]=missouri
  [MT]=montana [NE]=nebraska [NV]=nevada [NH]=new-hampshire [NJ]=new-jersey
  [NM]=new-mexico [NY]=new-york [NC]=north-carolina [ND]=north-dakota [OH]=ohio
  [OK]=oklahoma [OR]=oregon [PA]=pennsylvania [RI]=rhode-island [SC]=south-carolina
  [SD]=south-dakota [TN]=tennessee [TX]=texas [UT]=utah [VT]=vermont
  [VA]=virginia [WA]=washington [WV]=west-virginia [WI]=wisconsin [WY]=wyoming
)

mkdir -p "$DATA_DIR"

IFS=',' read -ra STATES <<< "$OSRM_STATES"
PBF_FILES=()

for STATE in "${STATES[@]}"; do
  STATE=$(echo "$STATE" | tr -d ' ' | tr '[:lower:]' '[:upper:]')
  REGION="${STATE_MAP[$STATE]:-}"

  if [ -z "$REGION" ]; then
    echo "Unknown state: $STATE"
    exit 1
  fi

  PBF_FILE="$DATA_DIR/${REGION}-latest.osm.pbf"
  URL="https://download.geofabrik.de/north-america/us/${REGION}-latest.osm.pbf"

  if [ -f "$PBF_FILE" ]; then
    echo "Already downloaded: $PBF_FILE"
  else
    echo "Downloading $REGION..."
    curl -L -o "$PBF_FILE" "$URL"
  fi

  PBF_FILES+=("$PBF_FILE")
done

# Merge if multiple states, otherwise use the single file
if [ ${#PBF_FILES[@]} -gt 1 ]; then
  echo "Merging ${#PBF_FILES[@]} state files..."
  MERGED="$DATA_DIR/region.osm.pbf"
  osmium merge "${PBF_FILES[@]}" -o "$MERGED" --overwrite
else
  MERGED="${PBF_FILES[0]}"
fi

OSRM_FILE="$DATA_DIR/region.osrm"

echo "Running OSRM extract..."
docker run --rm -v "$(realpath "$DATA_DIR"):/data" osrm/osrm-backend:latest \
  osrm-extract -p /opt/car.lua "/data/$(basename "$MERGED")"

# Rename extracted files to region.osrm if source wasn't already named that
BASENAME=$(basename "$MERGED" .osm.pbf)
if [ "$BASENAME" != "region" ]; then
  for f in "$DATA_DIR/$BASENAME".osrm*; do
    mv "$f" "$DATA_DIR/region${f#$DATA_DIR/$BASENAME}"
  done
fi

echo "Running OSRM partition..."
docker run --rm -v "$(realpath "$DATA_DIR"):/data" osrm/osrm-backend:latest \
  osrm-partition /data/region.osrm

echo "Running OSRM customize..."
docker run --rm -v "$(realpath "$DATA_DIR"):/data" osrm/osrm-backend:latest \
  osrm-customize /data/region.osrm

echo "OSRM data prepared in $DATA_DIR"
echo "To run the router: docker run -p 5000:5000 -v \$(realpath $DATA_DIR):/data osrm/osrm-backend:latest osrm-routed --algorithm mld /data/region.osrm"
