# Game Text Beacon

Game Text Beacon reads selected game text aloud for blind and low-vision PC players. It is for windowed or borderless games that draw dialogue, menus, or objectives without screen-reader labels.

The desktop app saves a screen region, captures that region on a hotkey or a connected controller’s first button, uses local Tesseract OCR, and reads the result with a local voice. Linux packages use eSpeak NG because WebKitGTK does not provide the browser Web Speech API. Choose capture frame shows a current display preview where you can draw, move, and resize the exact capture rectangle. It never automates game input. Check each game’s policy before using any capture helper.

## Try the demo

Run the site and open `http://localhost:4173/demo`, or use the deployed `/demo` route. The sample objective is bundled. The demo banner explains that it uses the `demo:game-text-beacon:` browser-storage namespace. Reset demo clears that key.

## Develop

```sh
npm install
npm run dev
```

For the desktop window on Debian or Ubuntu, install the documented native prerequisites once, then run it:

```sh
./scripts/install-linux-prereqs.sh
npm run tauri dev
```

Every released desktop package includes its own local Tesseract OCR engine and English language data. Linux releases also include eSpeak NG and its voice data. Development builds require Tesseract on PATH: on Debian/Ubuntu, use `sudo apt install tesseract-ocr espeak-ng`; on Windows install Tesseract OCR for development; on macOS use `brew install tesseract`.

## Verify and build

```sh
npm test
npm run build:site  # static landing site -> dist/site
npm run build       # same static deployment build -> dist/site
npm run tauri build # local native package build
npm run test:bundled-ocr-runtime # package a current-platform app and OCR a fixture with its bundled engine
npm run test:linux-package # build/install .deb, prove bundled OCR and exercise WebKitGTK speech
npm run test:linux-hotkey-package # exercise a real global shortcut, conflict, and recovery
npm run test:compatibility # run 25 timed reads across five real windowed games
npm run test:claims # run every exact claim command from .factory/claims.json
```

Native claim commands provision their Debian/Ubuntu build requirements through the idempotent prerequisite script. The packaged OCR regression extracts fresh Debian, RPM, and AppImage packages and reads a high-contrast fixture through each bundled executable and English data, without using PATH. The release workflow runs the equivalent mounted or installed package check for Linux, Windows, and macOS. The packaged hotkey claim installs the built `.deb`, starts two real app instances on one X11 display, sends an OS-level shortcut while another window has focus, and checks conflict recovery plus one captured reading.

`npm run build:site` is the deployment build command. The static output has `index.html` at `dist/site/index.html`.

## Release

Tag `v0.1.9` and push it to run `.github/workflows/release.yml`. The workflow builds unsigned macOS, Windows, and Linux packages, bundles Tesseract plus English data, reads an OCR fixture from each installed package, and adds release checksums and `latest.json`. The landing site reads a same-origin `latest.json`, so an unpublished release never creates a browser console error.

Native core regression checks need only Rust; use `cargo test --manifest-path src-tauri/Cargo.toml`. Desktop development and packaging additionally need the platform prerequisites. On Debian/Ubuntu run `./scripts/install-linux-prereqs.sh`, then `npm run tauri build`. The Linux landing-page download and `install.sh` prefer the verified `.deb`, which includes its own OCR data and local speech engine.

No telemetry, account, payment, or cloud OCR is included. See `/privacy` and `/terms` on the landing site for the user-facing terms.
