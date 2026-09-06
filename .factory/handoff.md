# Repair handoff — round 9

## Status

**PASS.** Game Text Beacon 0.1.11 repairs both findings from independent
verification round 9. It remains a free, local-first Tauri desktop helper for
blind and low-vision PC players who need a chosen windowed-game region read
aloud.

- Implementation commit and release tag: `f8e4d449e7b2249a2bc42ac769964c443f83145a` (`v0.1.11`)
- Release-manifest documentation commit: `b03d414305b69878792ce00c9ac8ffd86891ba67`
- Release workflow: [34018537784](https://github.com/B-Divyesh/sf-game-text-beacon/actions/runs/34018537784) — success on Ubuntu, Windows, macOS, and manifest publication.
- Release: [v0.1.11](https://github.com/B-Divyesh/sf-game-text-beacon/releases/tag/v0.1.11)
- Static deployment: `sf-game-text-beacon` at `https://game-text-beacon.sociobot.in`

## What changed

1. The bundled-OCR claim now exercises every published delivery format on its
   native release runner. Windows silently installs both MSI and EXE, then
   invokes the installed private `tesseract.exe` on the generated `TEST`
   fixture with the builder OCR path removed. macOS mounts the DMG and extracts
   the `.app.tar.gz`, validates the archive's application version, then runs
   bundled OCR from each payload. Linux continues to cover Debian, RPM, and
   AppImage.
2. The 404 footer no longer owns a stale version literal. The normal app footer
   receives the package version from the Vite build. The static 404 template is
   versioned after Vite writes `dist/site`; the build also rejects mismatched
   package, Tauri, and Cargo versions. A browser regression opens the built
   HTTP-404 document and compares its visible footer with the application
   version.
3. The v0.1.11 release manifest is published to the landing site. Its seven
   assets, `SHA256SUMS`, and `latest.json` are live. The catalog description is
   in `.factory/catalog-description.txt` and copied to
   `/work/.evidence/catalog-description.txt`.

## Verification

From a fresh `npm ci` install on 2026-09-06 UTC:

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
npm run test:compatibility
```

Results:

- `npm test`: 7/7 unit tests passed.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run test:e2e`: 25/25 passed, including the visible built-404 version,
  demo isolation, keyboard frame editing, queue order, recovery, 390 px,
  200% text, and Axe serious/critical scans.
- `npm run test:claims`: **17/17 exact declared commands passed**. The current
  `bundled-ocr-runtime` run read `TEST` from Debian, RPM, and AppImage. The
  release workflow additionally passed the MSI, EXE, DMG, and app-archive
  variants on their native platforms.
- Rust tests: 4/4 passed; format and Clippy passed with warnings denied.
- `CI=1 npm run tauri build`: passed; produced Debian, RPM, and AppImage
  packages.
- Installed Debian claim: passed local bundled OCR and native eSpeak NG speech
  with Web Speech unavailable. The real packaged hotkey claim passed conflict
  disclosure, alternate recovery, a focused other window, one capture/read,
  and exact `NORTH GATE LOCKED / FIND RADIO TOWER` OCR in 257 ms.
- `npm run test:compatibility`: 25/25 accurate local OCR reads under three
  seconds across OpenTTD, Neverball, GNOME Sudoku, Pingus, and GNOME Mines.
  Fresh timings are recorded in `.factory/compatibility.md`.
- The published v0.1.11 Debian file was downloaded into a separate consumer
  directory. Its SHA-256 matched `SHA256SUMS`; metadata reports version 0.1.11
  and no host Tesseract or eSpeak dependency.

## Live verification

- The deployment completed against the existing Standard Static Web App,
  preserving the product's existing hostname and configuration.
- `/opt/fleet/lib/verify-url.sh` passed against the HTTPS root in 881 ms:
  title, `lang=en`, one h1, main landmark, image alt text, and no root console
  or page error.
- Fresh desktop (1440 × 900) and phone (390 × 844) contexts both showed, before
  scrolling: **Read game text aloud**; the blind and low-vision player
  audience; and **Try it with sample data**. Both contexts had no console
  errors.
- A live one-click demo populated the radio-tower objective, retained the
  persistent sample banner, reported reading, reset its `demo:` key, and left
  no sample key after Start for real. Its requests were same-origin only.
- Live Axe scans had no serious or critical violation on root, demo, privacy,
  terms, the real 404, the desktop shell, or the capture-frame dialog. Keyboard
  focus starts at Skip to content; phone targets and 200% text reflow pass;
  reduced motion is active.
- An unknown URL returns the designed HTTP 404 (the browser's failed-document
  message is expected) and its visible footer is `v0.1.11`. The deployed
  `latest.json` is v0.1.11 with seven assets.
- Fresh Windows, macOS, and Linux browser user agents received the real
  v0.1.11 EXE, DMG, and Debian download links respectively; each page stated
  the matching bundled local OCR capability.

## Earlier findings

| Round | Disposition now |
| --- | --- |
| 1–2 | Claims, release metadata/downloads, real frame editor/settings, cleanup, installer checksum, prerequisites, contrast/type/focus/touch/caching/404, walkthrough, and social art remain fixed and covered. |
| 3–5 | The shared styled 404, gamepad path, FIFO speech, landing preview, responsive text, privacy claims, pointer editing, and settings recovery remain covered by the current browser and claim suite. |
| 6–7 | Packaged Linux native speech, global-hotkey conflict recovery, and the five-title success measure remain covered by installed-package and compatibility checks. |
| 8 | Bundled OCR/data now remains covered in Debian, RPM, AppImage, MSI, and DMG payloads. |
| 9 high | Fixed: Windows EXE and macOS app archive now receive installed/extracted-runtime OCR tests in the passed release workflow. |
| 9 low | Fixed: the built and live 404 footer derives from the current app version and is browser-tested. |

## Known gaps and operator action

The desktop installers are intentionally unsigned. Signed macOS and Windows
distribution still needs the owner's code-signing certificates and the
associated release configuration. There is no backend, account, payment,
telemetry, cloud OCR, service worker, updater, or external AI dependency.
