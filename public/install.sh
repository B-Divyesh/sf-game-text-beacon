#!/usr/bin/env sh
set -eu
repo='B-Divyesh/sf-game-text-beacon'
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
api="https://api.github.com/repos/$repo/releases/latest"
release=$(curl -fsSL "$api")
asset_name=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["name"] for a in d["assets"] if a["name"].lower().endswith(".appimage")))')
asset_url=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"].lower().endswith(".appimage")))')
checksums=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"]=="SHA256SUMS"))')
curl -fsSL "$asset_url" -o "$workdir/$asset_name"
curl -fsSL "$checksums" -o "$workdir/SHA256SUMS"
(cd "$workdir" && grep -F "  $asset_name" SHA256SUMS | sha256sum -c -)
mkdir -p "$HOME/.local/bin"
install -m 755 "$workdir/$asset_name" "$HOME/.local/bin/game-text-beacon"
echo "Installed Game Text Beacon at $HOME/.local/bin/game-text-beacon"
