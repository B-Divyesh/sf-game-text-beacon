# Game Text Beacon repair handoff

## Status

Repaired verification round 6 from candidate
`593975432ae210cea696889700f62220b85b23d3`. Version `0.1.7` keeps the Tauri
2 desktop artifact and Static Web Apps deployment class.

## What changed

- Reproduced the published v0.1.6 Debian failure in its real WebKitGTK process:
  both Web Speech globals were `undefined`, and constructing an utterance
  returned `ReferenceError: Can't find variable: SpeechSynthesisUtterance`.
- Added Tauri `speak_text` and `stop_speech` commands. Desktop reads now use a
  serialized native speech queue, stop the current voice process on request,
  and report an actionable local-voice error.
- Linux speech uses local eSpeak NG, with `espeak` as a native fallback. Text
  is passed as a process argument without a shell. macOS uses `say`; Windows
  uses the local System.Speech synthesizer.
- Debian packages now depend on `espeak-ng` and `tesseract-ocr`. RPM packages
  declare `espeak-ng` and `tesseract`. The Linux prerequisite script and
  release workflow install eSpeak NG.
- Replaced the browser-mock-only Linux claim with `npm run test:linux-package`.
  It builds and installs the `.deb`, inspects both dependencies, verifies the
  installed engine creates RIFF audio, starts `/usr/bin/game-text-beacon`,
  confirms Web Speech is absent in WebKitGTK, and invokes native speech there.
- The browser regression now removes both Web Speech globals and asserts that
  reading uses `speak_text`. Queue and Stop assertions also cover the native
  bridge commands.
- Updated claim, README, release version, workflow, and audited landing copy.

## Verification evidence

Run in `/work/repo` on 2026-08-29 UTC:

```text
npm ci                                                     PASS (100 packages, 0 vulnerabilities)
npm test                                                   PASS (5 tests)
npm run typecheck                                          PASS
npm run lint                                               PASS
npm run test:e2e                                           PASS (23 Playwright tests)
cargo test --manifest-path src-tauri/Cargo.toml            PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                                           PASS
npm run build                                              PASS (dist/site)
CI=1 npm run tauri build                                   PASS (.deb, .rpm, AppImage)
npm run test:linux-package                                 PASS
verify-url.sh http://127.0.0.1:4174                        PASS (585 ms; no errors)
```

The package claim produced this evidence:

```text
@claim:linux-ocr-package PASS
PASS dependencies: tesseract-ocr, espeak-ng
PASS WebKitGTK: Web Speech absent; native speak_text completed
```

The built Debian package is 6,575,384 bytes. Its SHA-256 is
`9cf2301b97431a6b176d7c7578b029947475355e89ad84f3a8dce8c23b000c81`.
Its metadata reports version `0.1.7` and dependencies `tesseract-ocr`,
`espeak-ng`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0`.

The production site build contains 22.85 KB raw / 8.15 KB gzip initial app
JavaScript and 11.69 KB raw / 3.38 KB gzip CSS. The hero image is 36.44 KB.
Local Playwright checks found no console errors, third-party requests,
serious/critical Axe violations, 390 px overflow, or touch targets under 44 px
on `/`, `/demo`, `/privacy`, `/terms`, and the 404 shell. Existing tests also
cover keyboard route focus, 200% text, reduced motion, demo isolation, local
capture, settings recovery, and response-safe download fallback.

## Release and deployment

Release `v0.1.7` was published by successful GitHub Actions run
`33244866883` from repair commit
`21445a4f109c04c21547eab87cb6ce9d693a1d0b`. It contains Linux Debian,
RPM, and AppImage assets; Windows EXE and MSI assets; a macOS universal DMG
and tarball; `SHA256SUMS`; and `latest.json`.

The published Debian asset is 6,576,792 bytes. Its SHA-256 is
`ce245d6e576d44f8e90f256ab0c88d49edfda395593166f0fd3e05f90462bc5c`,
which matches the release checksum. After installing that downloaded asset,
`dpkg-query` reported Game Text Beacon 0.1.7, Tesseract 5.3.4, and eSpeak NG
1.51 installed. Its real WebKitGTK window reported both Web Speech globals as
undefined and completed the native `speak_text` command.

The verified static output was deployed to production Static Web App
`sf-game-text-beacon` as deployment
`512f6a76-eeed-49a5-9998-c22130824787`. Live `verify-url.sh` passed in 744 ms
with no console or page errors. `/`, `/demo`, `/privacy`, and `/terms` return
200; the styled missing route returns 404. The live HTML, release manifest,
and hashed JavaScript match `dist/site` byte for byte. The live manifest points
to all v0.1.7 assets.

Live route Axe checks found no serious or critical issues. The 390 × 844 check
found no overflow, undersized controls, or browser errors. Keyboard order,
route focus, reduced motion, demo reset/isolation, and same-origin-only network
requests passed. Production responses include CSP, HSTS, `nosniff`, strict
referrer policy, and the restrictive permissions policy. Lighthouse mobile
scored 100 performance / 100 accessibility / 100 best practices / 100 SEO;
FCP was 0.8 s, LCP 1.1 s, CLS 0, TBT 10 ms, and transfer was 49 KiB.

There is no backend, account, payment flow, service worker, updater, or runtime
external API. Backend rate limits, PWA offline-update behavior, and consumer
package checks are not applicable.

Desktop packages remain unsigned. macOS notarization needs
`APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX`.

## How to verify

```sh
./scripts/install-linux-prereqs.sh
npm ci
npm test
npm run typecheck
npm run lint
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
npm run build
npm run test:linux-package
```

Open `/demo` for the isolated bundled sample. Its only storage key begins with
`demo:game-text-beacon:`; Reset demo removes that key.
