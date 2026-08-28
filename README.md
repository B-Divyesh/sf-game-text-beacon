# Game Text Beacon

Game Text Beacon reads selected game text aloud for blind and low-vision PC players. It is for windowed or borderless games that draw dialogue, menus, or objectives without screen-reader labels.

The desktop app saves a screen region, captures that region on a hotkey, uses a local Tesseract OCR installation, and reads the result with the system voice. It never automates game input. Check each game’s anti-cheat policy before using any overlay or capture helper.

## Try the demo

Run the site and open `http://localhost:4173/demo`, or use the deployed `/demo` route. The sample objective is bundled. The demo banner explains that it uses the `demo:game-text-beacon:` browser-storage namespace. Reset demo clears that key.

## Develop

```sh
npm install
npm run dev
```

For the desktop window:

```sh
npm run tauri dev
```

Tesseract must be installed and available as `tesseract` on your PATH for the native OCR command. On Debian/Ubuntu, use `sudo apt install tesseract-ocr`. On Windows, install Tesseract OCR and add its install folder to PATH. On macOS, use `brew install tesseract`.

## Verify and build

```sh
npm test
npm run build:site  # static landing site -> dist/site
npm run build       # same static deployment build -> dist/site
npm run tauri build # local native package build
```

`npm run build:site` is the deployment build command. The static output has `index.html` at `dist/site/index.html`.

## Release

Tag `v0.1.0` and push it to run `.github/workflows/release.yml`. The workflow builds unsigned macOS, Windows, and Linux packages and adds release checksums and `latest.json`. The download UI uses the GitHub API, not a cross-origin release redirect.

No telemetry, account, payment, or cloud OCR is included. See `/privacy` and `/terms` on the landing site for the user-facing terms.
