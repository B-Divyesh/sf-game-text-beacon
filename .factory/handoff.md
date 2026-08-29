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

Release and live deployment evidence will be added after tag `v0.1.7` finishes
the repository's macOS, Windows, and Linux workflow.

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
