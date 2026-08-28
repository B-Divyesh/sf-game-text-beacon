# Game Text Beacon

Game Text Beacon reads selected game text aloud for blind and low-vision PC players. It is for windowed or borderless games that draw dialogue, menus, or objectives without screen-reader labels.

The desktop app saves a screen region, captures that region on a hotkey, uses local Tesseract OCR, and reads the result with the system voice. Choose capture frame shows a current display preview where you can draw, move, and resize the exact capture rectangle. It never automates game input. Check each game’s anti-cheat policy before using any capture helper.

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

Released Debian packages declare `tesseract-ocr` as an installation dependency, so the package manager installs it with Beacon. Development builds require Tesseract on PATH: on Debian/Ubuntu, use `sudo apt install tesseract-ocr`; on Windows install Tesseract OCR and add its install folder to PATH; on macOS use `brew install tesseract`.

## Verify and build

```sh
npm test
npm run build:site  # static landing site -> dist/site
npm run build       # same static deployment build -> dist/site
npm run tauri build # local native package build
```

The two native claim commands in `.factory/claims.json` are deliberately pure Rust contract checks. They run after `npm ci` without GTK/WebKit development headers. Install the prerequisites above only when launching or packaging the desktop window.

`npm run build:site` is the deployment build command. The static output has `index.html` at `dist/site/index.html`.

## Release

Tag `v0.1.4` and push it to run `.github/workflows/release.yml`. The workflow builds unsigned macOS, Windows, and Linux packages, installs the Linux native prerequisites, and adds release checksums and `latest.json`. The landing site reads a same-origin `latest.json`, so an unpublished release never creates a browser console error.

Native core regression checks need only Rust; use `cargo test --manifest-path src-tauri/Cargo.toml`. Desktop development and packaging additionally need the platform prerequisites. On Debian/Ubuntu install `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf file tesseract-ocr`, then run `npm run tauri:build`. The Linux landing-page download and `install.sh` prefer the verified `.deb`, which installs `tesseract-ocr` as a package dependency.

No telemetry, account, payment, or cloud OCR is included. See `/privacy` and `/terms` on the landing site for the user-facing terms.
