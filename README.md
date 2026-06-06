<p align="center">
  <img src="logo/logo_full.png" alt="Random Reel" width="480"/>
</p>

# Random Reel — Jellyfin Plugin

A Jellyfin plugin that plays random clips from any folder or playlist, starting at a random position within configurable margins. Designed for long-form content (concerts, documentaries, compilations) where you want a serendipitous viewing experience without spoiling the full film.

---

## Features

- **"Random Reel" context menu item** — appears next to *Shuffle* on any folder or playlist
- **Random start position** — clips begin at a random timestamp, excluding a configurable margin at the start and end of each file
- **Configurable clip duration** — defaults to 10 minutes
- **Session-aware deduplication** — already-played clips are excluded from the pool until all items have been seen (no repeats within a session, unless opted in)
- **Clean watch history** — playback progress is never saved; clips never appear in *Continue Watching* or *Recently Watched*
- **Next button support** — the player's Next button picks the next random clip from the same folder
- **Docker-only workflow** — no local .NET installation required

---

## Requirements

- Jellyfin **10.9.11**
- Docker (build) — no local .NET installation needed

---

## Installation on an existing Jellyfin server (Docker Compose)

> This is the recommended path if you already have Jellyfin running via Docker Compose.

### 1 — Build the plugin

On any machine that has Docker:

```bash
git clone <this-repo>
cd jellyfin-plugin-shuffle

# Produces dist/Jellyfin.Plugin.RandomReel.dll + dist/meta.json
docker run --rm \
  -v "$(pwd)":/src -w /src \
  mcr.microsoft.com/dotnet/sdk:8.0 \
  dotnet build Jellyfin.Plugin.RandomReel/Jellyfin.Plugin.RandomReel.csproj \
    -c Release --nologo -v quiet
```

Copy the two files from `dist/` to your server (e.g. via `scp` or a shared volume):
- `Jellyfin.Plugin.RandomReel.dll`
- `meta.json`

### 2 — Drop the files into the plugins directory

On your server, place both files inside a dedicated folder under Jellyfin's plugin directory. The exact path depends on how your `docker-compose.yml` mounts `/config`:

```
<your-jellyfin-config>/plugins/RandomReel/
├── Jellyfin.Plugin.RandomReel.dll
└── meta.json
```

Example — if your compose file has:

```yaml
volumes:
  - /srv/jellyfin/config:/config
```

Then put the files in `/srv/jellyfin/config/plugins/RandomReel/`.

### 3 — Patch index.html

The plugin needs a `<script>` tag injected into Jellyfin's `index.html`. There are two ways to do this:

#### Option A — Let the plugin patch it automatically (simplest)

The plugin patches `index.html` on startup if it has write access to the web directory. Mount `index.html` as a writable file in your compose:

```bash
# Extract a clean index.html from the Jellyfin image (match your running version)
docker run --rm --entrypoint=cat jellyfin/jellyfin:10.9.11 \
  /jellyfin/jellyfin-web/index.html > /srv/jellyfin/index.html
```

Add this volume to your `docker-compose.yml`:

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:10.9.11
    volumes:
      - /srv/jellyfin/config:/config
      - /srv/jellyfin/cache:/cache
      # existing volumes ...
      - /srv/jellyfin/index.html:/jellyfin/jellyfin-web/index.html  # ← add this
```

On first startup the plugin will inject the `<script>` tag and log:
```
[RandomReel] Patched index.html at /jellyfin/jellyfin-web/index.html.
```

On subsequent restarts it detects the tag is already present and skips patching.

#### Option B — Patch manually (if you prefer not to mount index.html)

```bash
# Extract
docker run --rm --entrypoint=cat jellyfin/jellyfin:10.9.11 \
  /jellyfin/jellyfin-web/index.html > index.html

# Inject the tag
sed -i 's|</body>|<script src="/RandomReel/inject.js" defer></script>\n</body>|' index.html

# Mount the patched file (same volume line as Option A)
```

### 4 — Restart Jellyfin

```bash
docker compose restart jellyfin
```

Open **Dashboard → Plugins** and confirm *Random Reel* shows status **Active**.

---

## Quick Start (local dev with Docker)

```bash
# Clone and enter the repo
git clone <this-repo>
cd jellyfin-plugin-shuffle

# Build the plugin, patch index.html and start Jellyfin
./deploy.sh

# Open Jellyfin
open http://localhost:8096
```

`deploy.sh` handles everything:
1. Extracts `index.html` from the official Jellyfin image and injects the plugin script tag
2. Builds the plugin DLL inside a .NET 8 SDK container (nothing installed locally)
3. Writes `meta.json` alongside the DLL so Jellyfin recognises the plugin
4. Restarts the `jellyfin-shuffle-dev` container

On subsequent changes, just run `./deploy.sh` again.

---

## Configuration

Open **Dashboard → Plugins → Random Reel**:

| Setting | Default | Description |
|---|---|---|
| Playback Duration | 10 min | How long each clip plays |
| Edge Exclusion | 5 min | Margin skipped at the start and end of each file |
| Allow Repeats in Session | false | If true, clips can be replayed before the pool is exhausted |

---

## How It Works

### Server side (`ShuffleController`)

`GET /RandomReel/Next?folderId={id}` returns a random item from the folder with a random start position, respecting edge exclusion and session deduplication. Session state is kept in-memory and resets when the server restarts.

### Client side (`inject.js`)

Loaded via a `<script>` tag injected into Jellyfin's `index.html` at plugin startup. Uses a `MutationObserver` to detect Jellyfin's action sheet and append the *Random Reel* item next to *Shuffle*.

Playback is triggered via `POST /Sessions/{id}/Playing` (the standard Jellyfin Sessions API — the same mechanism used by *Play On*).

To prevent the clip from appearing in *Continue Watching*, the script intercepts `fetch` calls and suppresses `Sessions/Playing/Progress` reports while a reel is active. When the player signals `Sessions/Playing/Stopped`, the item is marked as played (resets position) and immediately unplayed (removes from watched list).

---

## Project structure

```
Jellyfin.Plugin.RandomReel/
├── Api/
│   ├── ShuffleController.cs     # GET /RandomReel/Next, POST /RandomReel/Session/Reset
│   ├── ShuffleNextResponse.cs   # Response model
│   └── InjectController.cs      # GET /RandomReel/inject.js (serves embedded JS)
├── Configuration/
│   ├── PluginConfiguration.cs
│   └── configPage.html
├── Web/
│   └── inject.js                # Context menu injector + playback logic
└── Plugin.cs                    # Patches index.html at startup
deploy.sh                        # Docker build + deploy script
docker-compose.yml
```

---

## Acknowledgements

This plugin was built on top of:

- **[jellyfin-plugin-template](https://github.com/jellyfin/jellyfin-plugin-template)** — the official Jellyfin plugin scaffold, which provided the project structure, build configuration, StyleCop ruleset and the initial `Plugin` / `PluginConfiguration` boilerplate.

- **[Jellyfin-JavaScript-Injector](https://github.com/nicholasgasior/Jellyfin-JavaScript-Injector)** — a reference implementation for injecting custom JavaScript into Jellyfin's web client via index.html patching, which inspired the approach used in `Plugin.cs` and `InjectController.cs`.

---

## License

GPL-3.0 — see [LICENSE](LICENSE).
