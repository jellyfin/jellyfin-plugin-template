#!/usr/bin/env bash
# Build the plugin inside a .NET SDK container and hot-deploy it into Jellyfin.
# Requirements: Docker (nothing else needed locally).
#
# Usage:
#   ./deploy.sh          — Release build, copy to ./dist, restart Jellyfin
#   ./deploy.sh --debug  — Debug build

set -euo pipefail

BUILD="${1:-}"
CONFIGURATION="Release"
[[ "$BUILD" == "--debug" ]] && CONFIGURATION="Debug"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$PROJECT_DIR/dist"
mkdir -p "$OUT_DIR"

echo "==> Building $CONFIGURATION inside dotnet SDK container..."
docker run --rm \
  -v "$PROJECT_DIR":/src \
  -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet build Jellyfin.Plugin.RandomReel/Jellyfin.Plugin.RandomReel.csproj \
    -c "$CONFIGURATION" --nologo -v quiet

DLL=$(find "$PROJECT_DIR/Jellyfin.Plugin.RandomReel/bin/$CONFIGURATION" \
  -name "Jellyfin.Plugin.RandomReel.dll" | head -1)

if [[ -z "$DLL" ]]; then
  echo "ERROR: DLL not found after build." >&2
  exit 1
fi

cp "$DLL" "$OUT_DIR/"
echo "==> Copied to $OUT_DIR/$(basename "$DLL")"

# Write meta.json so Jellyfin recognises the plugin as compatible (targetAbi must match server version)
cat > "$OUT_DIR/meta.json" << 'METAEOF'
{
  "category": "General",
  "changelog": "Initial release",
  "description": "Plays random clips from a folder or playlist, starting at a random position within configurable margins.",
  "guid": "a3a23ce9-cf03-4772-b49a-170913d6139a",
  "imageUrl": null,
  "name": "Random Reel",
  "overview": "Random clip playback from folders and playlists",
  "owner": "deppa",
  "targetAbi": "10.9.0.0",
  "timestamp": "2026-06-06T00:00:00Z",
  "version": "1.0.0.0"
}
METAEOF
echo "==> meta.json written"

if docker ps --format '{{.Names}}' | grep -q '^jellyfin-shuffle-dev$'; then
  echo "==> Restarting jellyfin-shuffle-dev..."
  docker restart jellyfin-shuffle-dev
  echo "==> Done. Jellyfin available at http://localhost:8096"
else
  echo "==> Container not running. Start it with:"
  echo "      docker compose up -d"
fi
