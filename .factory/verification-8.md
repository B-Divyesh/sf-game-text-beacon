# Independent product verification — round 8

## Verdict: FAIL

- Candidate: `120e6e81c2648599fc2d91773e6a0df7ea36c510`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: `2026-08-29` UTC
- Work order: `game-text-beacon-verify-8`

The live site, demo, and Debian package work, and the repaired global-hotkey
path passes a real packaged-app test. The candidate is not releasable because
the advertised Windows installer omits the OCR engine required for the core
job. This violates both the brief's Windows scope and the one-step desktop
installation contract.

## Mandatory first read: PASS

A cold 1440 × 900 live load answers all three questions in its first viewport:

- What: **“Read game text aloud.”**
- For whom: **“For blind and low-vision players when a game only shows text on
  screen.”**
- First action: **“Try it with sample data,”** with **“Hear a sample objective
  right away.”** beside it.

The action opens `/demo` in one click. The first demo view contains a realistic
objective and the persistent **“Demo — sample data, nothing is saved”** banner
with Reset demo and Start for real.

## Release-blocking finding

### High — the Windows installer cannot perform OCR after a one-step install

The live site detects Windows and says
**“A package for this computer is ready: Game.Text.Beacon_0.1.8_x64-setup.exe.”**
It provides no OCR prerequisite warning. The published MSI does not contain
the required OCR runtime:

- `msiinfo export ... File` lists exactly one installed file,
  `game-text-beacon.exe` (13,963,264 bytes). There is no Tesseract executable,
  `tessdata`, or `eng.traineddata`.
- `src-tauri/src/lib.rs` invokes an executable named `tesseract`; it does not
  resolve a bundled binary.
- `src-tauri/tauri.conf.json` declares Tesseract and eSpeak dependencies only
  for Debian and RPM. It declares no Windows resource or sidecar.
- `public/install.ps1` downloads, checksum-verifies, and opens the app
  installer only. It does not install OCR.
- The release workflow installs Tesseract only in its Linux build job.
- The README confirms the failure mode by instructing Windows users to install
  Tesseract separately and add it to PATH.

A fresh Windows user can install the offered app but cannot complete its core
capture → OCR → speech job. That is outside the researched brief, which names
Windows and Linux, and outside the attached installer contract requiring one
obvious installation step.

The packaging defect is broader: the published universal macOS app archive
contains only the app binary, icon, and plist, with no Tesseract payload. The
locally built AppImage contains no Tesseract, English language data, or eSpeak
payload. The Debian and RPM package-manager paths do declare the engines.

The generic `desktop-local-ocr` claim does not catch this. Its test executes
the host's already-installed Linux `tesseract`; only the Debian package claim
checks an installer dependency. There is no installed-package OCR claim for
Windows, macOS, or AppImage.

Required repair: bundle Tesseract and English language data in every advertised
self-contained installer and resolve the bundled executable, or remove the
unsupported downloads and narrow the product scope and copy. Add clean-machine
package tests for each advertised platform; the Windows test must install only
the released package and complete one OCR read without a preinstalled
Tesseract.

## Mandatory claims results

`.factory/claims.json` exists with 16 entries. After the standard clean-checkout
`npm ci`, every exact command was run independently and passed:

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-read` | PASS | sample objective entered the reading state |
| `demo-isolated` | PASS | only the demo-prefixed key was written and reset |
| `local-demo-network` | PASS | complete demo request log was same-origin |
| `no-telemetry` | PASS | landing-to-demo flow made no third-party request |
| `no-payments` | PASS | no account, checkout, or payment request |
| `no-cloud-screenshots` | PASS | preview used only the mocked local bridge |
| `desktop-local-ocr` | PASS | local Linux Tesseract process ran; no HTTP path |
| `free-no-account` | PASS | sample opened without authentication |
| `saved-region-settings` | PASS | changed region and hotkey survived a fresh store |
| `windowed-capture` | PASS | region was bounded; outside-display input rejected |
| `capture-frame` | PASS | pointer and keyboard draw/move/resize/save worked |
| `reading-queue` | PASS | two captures were spoken in order; stop worked |
| `gamepad-read` | PASS | one held button produced exactly one capture |
| `no-game-automation` | PASS | bridge calls contained no game-control operation |
| `linux-ocr-package` | PASS | installed Debian package declared OCR/speech and spoke |
| `packaged-global-hotkey` | PASS | conflict recovery and real X11 shortcut worked in 509 ms |

A preliminary invocation before installing Node dependencies could not load
`@playwright/test` and could not start Tauri packaging. This was a verifier
setup precondition, not an assertion failure. After `npm ci`, the exact 16/16
claim sequence above passed without source changes.

## Core product and recovery evidence

The current Debian package was built and installed. It declared
`tesseract-ocr`, `espeak-ng`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0` and passed
native speech without Web Speech. The packaged global-hotkey test:

- exposed a startup conflict from a second instance;
- offered and registered `Ctrl+Alt+R` as an alternate;
- left another window focused;
- captured and recognized `NORTH GATE LOCKED / FIND RADIO TOWER` exactly once.

The full browser suite covered pointer and keyboard capture-frame editing,
minimum frame dimensions, queue order, repeat/stop, gamepad edge detection,
missing saved settings with retry, an empty hotkey, a startup hotkey conflict
with recovery, missing Web Speech, and download-manifest failure. The Rust
suite also rejected an entirely off-display region. No tested recovery path
produced a page error.

The independent five-title run used the installed package, real windowed games,
the OS-level shortcut, local screen capture, and Tesseract. It met the brief's
80% threshold in every title:

| Title | Accurate reads under 3 seconds | Fresh timings (ms) |
| --- | ---: | --- |
| OpenTTD 13.4 | 5/5 | 417, 339, 301, 383, 379 |
| Neverball 1.6.0 | 4/5 | timeout, 1,487, 2,602, 2,897, 888 |
| GNOME Sudoku 46.0 | 5/5 | 413, 484, 376, 380, 380 |
| Pingus 0.7.6 | 4/5 | 675, 875, 777, timeout, 503 |
| GNOME Mines 40.1 | 5/5 | 316, 384, 281, 332, 286 |

Overall: 23/25 accurate reads under three seconds. The two timeouts are not a
contract failure because each affected title still achieved exactly 80%.

## Local build and automated gates

| Check | Result |
| --- | --- |
| Checkout identity | PASS — HEAD and `origin/main` were the candidate |
| `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 5 tests in 2 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e` | PASS — 24 tests |
| All 16 exact claim commands | PASS — 16/16 after install |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 3 tests |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS |
| `npm run build` | PASS — `dist/site/` produced |
| `CI=1 npm run tauri build` | PASS — Debian, RPM, and AppImage produced |
| `npm run test:compatibility` | PASS — 23/25; every title at least 4/5 |
| `/opt/fleet/lib/verify-url.sh` on live root | PASS — 790 ms, no errors |

The static build contains 25,219 bytes of raw JavaScript in three chunks
(about 9.3 KiB gzip), 11,828 bytes of CSS (3.43 KiB gzip), no web font, and a
36,440-byte hero WebP. These are well below the product budgets.

## Live deployment, privacy, accessibility, and performance

All public candidate build files matched the live deployment byte for byte:
HTML, hashed JS/CSS, art, icons, installers, metadata, and `latest.json`.
`staticwebapp.config.json` correctly returns 404 because it is deployment
configuration, not a public file. Tag `v0.1.8` resolves to source commit
`72ad05efecf0870c33e3488aa9255c2492c94c75`; the candidate changes after that
tag affect only the release manifest and handoff, not application source.

- `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown route returns
  the designed page with HTTP 404.
- Every inspected route has `lang=en`, one h1, one main landmark, a specific
  title, and zero serious/critical Axe findings.
- Root, demo, privacy, terms, and the desktop shell logged no console or page
  error. Chromium reports the expected failed-document message for the
  intentionally requested HTTP 404 only.
- Landing → demo → read → reset → leave made only same-origin requests. Reset
  and exit removed the sole `demo:game-text-beacon:visited` key.
- Keyboard order starts with Skip to content. Every sampled focus state has a
  4 px visible ochre outline; Enter opens the demo; route/back navigation
  focuses the destination h1.
- At 390 × 844 there is no horizontal overflow and no visible control smaller
  than 44 × 44 CSS pixels. The local 200% text-size test also has no overflow.
- Reduced motion changes the hero animation to `none` with effectively instant
  residual timing.
- Browser-observed headers include CSP, HSTS, `nosniff`, strict-origin
  referrer policy, and restrictive permissions policy. HTML revalidates after
  30 seconds, hashed assets and art are immutable for one year, and
  `latest.json` is `no-store`.
- No analytics, telemetry, account, payment, cloud OCR, screenshot upload,
  third-party font/script, Azure/OpenAI endpoint, or runtime third-party
  request was observed.

Fresh Lighthouse mobile: **100 performance / 100 accessibility / 100 best
practices / 100 SEO**; FCP 0.9 s, LCP 1.2 s, TBT 40 ms, CLS 0, and Speed Index
2.7 s.

## Release evidence and applicability

GitHub Actions run `33251225040` completed successfully for source commit
`72ad05e`. Release v0.1.8 contains Debian, RPM, AppImage, universal macOS DMG
and app archive, Windows EXE/MSI, `SHA256SUMS`, and `latest.json`. Every URL in
the live release manifest returned 200. The downloaded Debian SHA-256 matched
the published value exactly:
`fa2b4f0486f362b078e57d1d5fd513e1629ff3b3e02c71b4b2ad7023fbe734ea`.

This product has no backend/API, authentication, payment flow, service worker,
updater, library, or CLI. Server rate-limit/429, Entra authority, backend
concurrency, PWA offline/update, and consumer-package checks are not
applicable. Local settings persistence is covered by the Rust claim test.
