#!/usr/bin/env sh
set -eu
repo='B-Divyesh/sf-game-text-beacon'
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
api="https://api.github.com/repos/$repo/releases/latest"
release=$(curl -fsSL "$api")
asset_name=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["name"] for a in d["assets"] if a["name"].lower().endswith(".deb")))')
asset_url=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"].lower().endswith(".deb")))')
checksums=$(printf '%s' "$release" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(a["browser_download_url"] for a in d["assets"] if a["name"]=="SHA256SUMS"))')
curl -fsSL "$asset_url" -o "$workdir/$asset_name"
curl -fsSL "$checksums" -o "$workdir/SHA256SUMS"
(cd "$workdir" && grep -F "  $asset_name" SHA256SUMS | sha256sum -c -)
if ! command -v apt-get >/dev/null 2>&1; then
  echo "This installer needs Debian or Ubuntu's apt-get so it can install local Tesseract OCR." >&2
  echo "Download the verified .deb from the release page for another Linux package manager." >&2
  exit 1
fi
if [ "$(id -u)" -eq 0 ]; then
  apt-get install -y "$workdir/$asset_name"
else
  sudo apt-get install -y "$workdir/$asset_name"
fi
echo "Verified and installed $asset_name with its local Tesseract OCR dependency."
