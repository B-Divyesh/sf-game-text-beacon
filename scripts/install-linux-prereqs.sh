#!/usr/bin/env sh
# Required only for running or packaging the native Tauri window on Debian/Ubuntu.
# Pure local-contract claim tests intentionally do not require these headers.
set -eu
if [ "$(id -u)" -eq 0 ]; then
  apt-get update
  apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf file tesseract-ocr
else
  sudo apt-get update
  sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf file tesseract-ocr
fi
