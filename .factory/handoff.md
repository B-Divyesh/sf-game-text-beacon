# Game Text Beacon repair handoff

## Status

Repaired verification round 5 from candidate
`4f318b35a4a0c696fd8b67401730f03530cb2a63`. The repaired source is version
`0.1.6`; it keeps the Tauri 2 desktop artifact and the Static Web Apps site.

## What changed

- The landing preview now has its own polite live status and its Read action
  cannot dereference a missing status node.
- Public layout now permits grid children and long package filenames to shrink
  and wrap. A 390 px / 200% text regression covers `/` and `/demo`.
- Added claim entries and request/flow tests for no telemetry, no payments,
  and no cloud screenshot upload.
- The native OCR claim runs `CommandLocalOcr` against the installed local
  `tesseract` executable, asserts no HTTP URL exists in that runner, and
  confirms the temporary capture is deleted.
- The capture-frame claim now performs pointer draw, move, and resize before
  checking keyboard editing and save.
- A rejected first `get_settings` now retains usable default local settings,
  explains recovery in the live status, and offers Retry saved settings.
- README now correctly states that there are three native claim commands.

## Verification evidence

Run in `/work/repo` on 2026-08-29 UTC:

```text
npm ci                                                     PASS (100 packages, 0 vulnerabilities)
npm test                                                   PASS (5 tests)
npm run typecheck                                          PASS
npm run test:e2e                                           PASS (22 Playwright tests)
all 12 browser claim commands                              PASS (1 test each)
all 3 native claim commands                                PASS (1 test each)
cargo test --manifest-path src-tauri/Cargo.toml            PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                                           PASS
npm run build                                              PASS (dist/site)
CI=1 npm run tauri build                                   PASS (.deb, .rpm, AppImage)
verify-url.sh http://127.0.0.1:4174                        PASS (no errors; title/lang/one h1/main/alt checks)
```

The local verification report is at `/tmp/game-text-beacon-verify-local/verify.json`.
It recorded a 636 ms local shell load and no console or page errors. Playwright
also covers keyboard order, focus, 390 px touch targets, 200% text reflow,
desktop recovery, reduced motion, and serious/critical Axe findings on every
public route and the frame picker.

The production build is 22.28 KB raw / 7.92 KB gzip JavaScript and 11.69 KB
raw / 3.38 KB gzip CSS. The local native package build produced:

```text
Game Text Beacon_0.1.6_amd64.deb       6,547,398 bytes
Game Text Beacon-0.1.6-1.x86_64.rpm    6,547,269 bytes
Game Text Beacon_0.1.6_amd64.AppImage 56,151,525 bytes
```

The Debian package version is `0.1.6` and declares `tesseract-ocr`,
`libwebkit2gtk-4.1-0`, and `libgtk-3-0` as dependencies. Its local SHA-256 is
`ed99b0c5552f99cc90477a3f10b0d7884c546126e40da0e4514f5686f2d7ecbe`.

## Release and deployment

The GitHub Actions tag release and Static Web Apps production deployment are
performed after this handoff update so the public download manifest and live
site can be verified against the exact committed repair.

Desktop packages intentionally remain unsigned. macOS notarization requires
`APPLE_CERTIFICATE`; Windows Authenticode requires `WINDOWS_CERT_PFX`.

## How to run

```sh
npm ci
npm run dev
# open /demo, or start the desktop app after Linux prerequisites
./scripts/install-linux-prereqs.sh
npm run tauri dev
```

The demo uses only the `demo:game-text-beacon:` browser-storage namespace.
`/demo` starts with its bundled sample objective; Reset demo removes that key.
