#!/usr/bin/env sh
set -eu
repo='B-Divyesh/sf-game-text-beacon'
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
api="https://api.github.com/repos/$repo/releases/latest"
asset_url=$(curl -fsSL "$api" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"].lower().endswith(".appimage")))')
checksums=$(curl -fsSL "$api" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"]=="SHA256SUMS"))')
curl -fsSL "$asset_url" -o "$workdir/beacon.AppImage"
curl -fsSL "$checksums" -o "$workdir/SHA256SUMS"
(cd "$workdir" && grep 'beacon.AppImage' SHA256SUMS | sha256sum -c -)
mkdir -p "$HOME/.local/bin"
install -m 755 "$workdir/beacon.AppImage" "$HOME/.local/bin/game-text-beacon"
echo "Installed Game Text Beacon at $HOME/.local/bin/game-text-beacon"
