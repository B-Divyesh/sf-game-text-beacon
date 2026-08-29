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

Released Debian packages declare `tesseract-ocr` and `espeak-ng` as installation dependencies, so the package manager installs local recognition and speech with Beacon. Development builds require both commands on PATH: on Debian/Ubuntu, use `sudo apt install tesseract-ocr espeak-ng`; on Windows install Tesseract OCR and add its install folder to PATH; on macOS use `brew install tesseract`.

## Verify and build

```sh
npm test
npm run build:site  # static landing site -> dist/site
npm run build       # same static deployment build -> dist/site
npm run tauri build # local native package build
npm run test:linux-package # build/install .deb, inspect dependencies, exercise WebKitGTK speech
```

The three native claim commands in `.factory/claims.json` are Rust contract checks. They run without GTK/WebKit development headers; the local-OCR claim invokes the installed Tesseract executable. Install the prerequisites above before running that OCR check, launching, or packaging the desktop window.

`npm run build:site` is the deployment build command. The static output has `index.html` at `dist/site/index.html`.

## Release

Tag `v0.1.7` and push it to run `.github/workflows/release.yml`. The workflow builds unsigned macOS, Windows, and Linux packages, installs the Linux native prerequisites, and adds release checksums and `latest.json`. The landing site reads a same-origin `latest.json`, so an unpublished release never creates a browser console error.

Native core regression checks need only Rust; use `cargo test --manifest-path src-tauri/Cargo.toml`. Desktop development and packaging additionally need the platform prerequisites. On Debian/Ubuntu run `./scripts/install-linux-prereqs.sh`, then `npm run tauri build`. The Linux landing-page download and `install.sh` prefer the verified `.deb`, which installs both local runtime engines.

No telemetry, account, payment, or cloud OCR is included. See `/privacy` and `/terms` on the landing site for the user-facing terms.
