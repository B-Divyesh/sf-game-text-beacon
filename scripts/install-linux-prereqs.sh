#!/usr/bin/env sh
# Installs everything used by the Linux desktop build and its packaged-runtime
# claims. Keeping this provisioning in one idempotent command makes every
# native claim reproducible on a clean Debian/Ubuntu worker.
set -eu

if command -v tesseract >/dev/null 2>&1 &&
  command -v espeak-ng >/dev/null 2>&1 &&
  command -v Xvfb >/dev/null 2>&1 &&
  command -v xdotool >/dev/null 2>&1 &&
  pkg-config --exists webkit2gtk-4.1 gtk+-3.0 ayatana-appindicator3-0.1; then
  echo "Linux desktop test prerequisites are already installed."
  exit 0
fi

if [ "$(id -u)" -eq 0 ]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf file tesseract-ocr espeak-ng xvfb xdotool dbus-x11
else
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf file tesseract-ocr espeak-ng xvfb xdotool dbus-x11
fi
