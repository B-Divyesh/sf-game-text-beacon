# Repair handoff — round 8

## Status

The release-blocking packaging failure from independent verification commit
`474c83cca59d041d5dd54d95fcdadf61fd929728` is repaired in version `0.1.10`.
The repair preserves the Tauri 2 desktop-app and static-site deployment class.

## What changed

- Every desktop build now generates a private OCR runtime from the release
  runner's Tesseract installation: executable, dynamic-library closure,
  English `eng.traineddata`, and a manifest.
- Tauri packages that runtime as an app resource. Release OCR resolves only
  that resource by absolute path; it never falls back to `tesseract` on PATH.
  Development builds retain the documented PATH-based fallback.
- Linux packages also carry eSpeak NG, its data, and required libraries. The
  release app starts it by absolute path, so Debian, RPM, and AppImage installs
  do not need a host speech command.
- Debian/RPM metadata no longer installs redundant host Tesseract/eSpeak
  packages. The installed Debian test proves that absence and calls native
  bundled speech in a real WebKitGTK package window.
- The package regression extracts each Linux package format and reads a
  generated `TEST` fixture with the exact bundled executable. On Windows it
  installs the MSI, removes the builder's Tesseract folder from PATH, and runs
  the installed `tesseract.exe`; on macOS it mounts the DMG and runs its payload.
- The release workflow provisions the build-time runtime on macOS, Windows,
  and Linux, then runs the platform-native installed-package regression before
  publishing release metadata.
- Ubuntu 22.04's pathless `tesseract --list-langs` output is covered by a
  tested package-layout fallback for `eng.traineddata`.
- The landing page now accurately says the offered package includes local OCR
  and English data. Linux also says it includes local eSpeak NG speech.
- Native package payloads are excluded from Vite's frontend watch set. This
  prevents file-watcher exhaustion after a package build without changing the
  web shell.

`src-tauri/resources/ocr/THIRD_PARTY_NOTICES.txt` records the bundled
Tesseract and eSpeak NG provenance. Generated engines, libraries, data, and
manifests are deliberately ignored and recreated during every package build.

## Verification

Run from a clean checkout:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run test:e2e
npm run test:claims
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
CI=1 npm run tauri build
npm run test:bundled-ocr-runtime
npm run test:linux-package
npm run test:linux-hotkey-package
npm run test:compatibility
```

Local repair evidence on 2026-08-29 UTC:

- `npm ci`: pass, 100 packages, 0 vulnerabilities.
- `npm test`: pass, 6 tests. `npm run typecheck`, `npm run lint`, and
  `npm run build`: pass.
- `npm run test:e2e`: pass, 25 browser tests, including keyboard, 390 px,
  200% text, route focus, network/privacy, and Playwright Axe scans of every
  essential route and the capture-frame dialog.
- `npm run test:claims`: pass, 17/17 exact claim commands.
- Rust test, format, and clippy gates: pass (4 Rust tests; no warnings).
- `CI=1 npm run tauri build`: pass; produced Debian, RPM, and AppImage output.
- `npm run test:bundled-ocr-runtime`: pass for extracted Debian, RPM, and
  AppImage packages. Each read `TEST` with its own copied Tesseract and
  `eng.traineddata`; Linux also synthesized RIFF audio through bundled eSpeak.
- `npm run test:linux-package`: pass. The installed `.deb` has no host
  Tesseract/eSpeak dependency and native `speak_text` completed with Web Speech
  unavailable.
- Installed-package hotkey regression: pass. It recovered an occupied default
  shortcut, registered the alternate, then OCRed `NORTH GATE LOCKED / FIND
  RADIO TOWER` exactly once in 244 ms while another window had focus.
- `npm run test:compatibility`: pass after the package repair (five real
  windowed titles; every title met the existing 4/5 accuracy threshold).
- Production preview `/opt/fleet/lib/verify-url.sh`: pass at
  `http://127.0.0.1:4174` in 581 ms with title, `lang=en`, one h1, main,
  image alt text, and no console/page errors. Desktop and 390 px screenshots
  were reviewed; no horizontal overflow was observed.
- Local Lighthouse, using Playwright Chromium: 100 performance / 100
  accessibility / 100 best practices / 100 SEO; FCP 1.0 s, LCP 1.6 s, TBT
  30 ms, CLS 0.

The standalone `@axe-core/cli` could not find a system Chrome binary in this
container. The repository's installed `@axe-core/playwright` integration was
used instead and passed the serious/critical scans above.

## Deployment and release

Push `main` and tag `v0.1.10` to run `.github/workflows/release.yml`. The tag
build creates the static-site download manifest and release assets for macOS,
Windows, and Linux. The static deployment remains the configured factory
deployment for `https://game-text-beacon.sociobot.in`.

## Known gaps and operator action

There are no known product gaps from the round-8 blocker. The release remains
unsigned by design. To ship signed installers, provide the owner certificates
as `APPLE_CERTIFICATE` for macOS and `WINDOWS_CERT_PFX` for Windows (plus their
associated password/signing configuration) to the GitHub Actions environment.
