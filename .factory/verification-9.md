# Verify Game Text Beacon reads game text aloud — round 9

## Verdict: FAIL

- Findings: **2** (1 high, 1 low)
- Untested claims: **1**
- Implementation candidate: `4e063f673d54d188c0df8226ed1ddbf1601d2b17`
- Documentation reviewed: `a1225b3f856fa52f7eced422e16cee88089808b6`
- Live URL: `https://game-text-beacon.sociobot.in`
- Release: `v0.1.10`
- Verified: `2026-09-05` UTC
- Work order: `game-text-beacon-verify-9`

Game Text Beacon reads a chosen game-screen region aloud for blind and
low-vision PC players. Before scrolling, a fresh desktop and 390 px phone
browser both showed the job, the audience, and **Try it with sample data** as
the first action.

The live demo and published Linux package complete the core job. The product
does not pass this verification because one cross-platform package claim is
not fully tested and the 404 page publishes a stale version.

## Findings

### High — the package claim does not test two released package formats

Claim `bundled-ocr-runtime` says **“Every advertised desktop package includes
local Tesseract OCR and English data.”** The README broadens this to **“Every
released desktop package.”** Its command passes, but the cross-platform test
does not exercise every package it covers:

- On Windows, `scripts/test-bundled-ocr-runtime.mjs` installs and runs only the
  `.msi`. The live Windows download button selects
  `Game.Text.Beacon_0.1.10_x64-setup.exe`, because the EXE appears before the
  MSI in `latest.json`.
- On macOS, the test mounts and runs only the DMG. It does not extract or run
  the released `Game.Text.Beacon_universal.app.tar.gz`.
- GitHub Actions run `33260334953` invokes this same test. Its successful
  Windows and macOS jobs therefore do not add coverage for the EXE or app
  archive.

Independent archive inspection found `tesseract.exe`, English trained data,
the runtime manifest, and the DLL closure inside the published Windows EXE.
That is useful payload evidence, but it does not prove that a clean EXE install
can start the bundled engine and read the fixture. No macOS consumer run
exercises the app archive either. The public claim is therefore incomplete
under the claims contract. Required repair: make the landing page select the
tested MSI and narrow the README claim, or add clean installed-artifact OCR
tests for the EXE and macOS app archive.

### Low — the live 404 footer reports the wrong version

An unknown URL correctly returns the designed page with HTTP 404. Its footer
nevertheless says `v0.1.6`, while the live product and release are `v0.1.10`.
This is a false public build identifier and differs from every normal route.
The ordinary browser failed-document message for the deliberate 404 is
expected and is not counted as a defect.

## First screen and demo

- Desktop at 1440 × 900 and phone at 390 × 844 showed **Read game text
  aloud**, the blind and low-vision audience, and the sample action without
  scrolling.
- One click opened `/demo` with the realistic radio-tower objective already
  populated.
- The persistent **Demo — sample data, nothing is saved** banner contained
  Reset demo and Start for real.
- Reading changed the live status to **Sample objective is reading.**
- Reset removed `demo:game-text-beacon:visited`; leaving the demo left no demo
  storage behind. No real-data key was read or changed.
- The complete landing and demo flow made only same-origin requests and logged
  no page or console error.

## Declared claim results

The repository was cloned without build output into
`/tmp/game-text-beacon-verify9-72rHl6`. After `npm ci` and the documented
Linux prerequisite installer, `npm run test:claims` ran each exact command
from `.factory/claims.json` and reported **PASS 17/17**.

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-read` | PASS | The shipped sample entered the reading state. |
| `demo-isolated` | PASS | Only the demo-prefixed key was written and Reset removed it. |
| `local-demo-network` | PASS | The sample flow requested only the product origin. |
| `no-telemetry` | PASS | The public sample flow made no third-party request. |
| `no-payments` | PASS | The sample required no account, checkout, or payment request. |
| `no-cloud-screenshots` | PASS | The frame preview used only the declared local bridge calls. |
| `desktop-local-ocr` | PASS | The native runner invoked local Tesseract and removed its private capture. |
| `bundled-ocr-runtime` | **INCOMPLETE** | Debian, RPM, AppImage, MSI, and DMG paths are covered; the released Windows EXE and macOS app archive are not executed. |
| `free-no-account` | PASS | The sample opened without authentication. |
| `saved-region-settings` | PASS | Exact changed values survived reopening a fresh local store. |
| `windowed-capture` | PASS | Partial bounds were clamped and an off-display frame was rejected. |
| `capture-frame` | PASS | Pointer and keyboard draw, move, resize, and save passed. |
| `reading-queue` | PASS | Two results were spoken in order; stop invoked native stop. |
| `gamepad-read` | PASS | One held first-button press produced one capture and one result. |
| `no-game-automation` | PASS | The read path issued no game-control command. |
| `linux-ocr-package` | PASS | The installed Debian app used bundled OCR and native speech without Web Speech. |
| `packaged-global-hotkey` | PASS | Conflict recovery registered an alternate and one OS shortcut produced one OCR result. |

Because `bundled-ocr-runtime` does not cover every package named by its public
claim, the untested-claim count is **1** even though its exact command exits
successfully.

## Published desktop artifact

GitHub release `v0.1.10` contains seven platform assets, `SHA256SUMS`, and
`latest.json`. Actions run `33260334953` completed successfully at the
implementation candidate in its macOS, Windows, Linux, and manifest jobs.

The published Debian package was downloaded into a fresh temporary consumer
directory. Its SHA-256 was
`d67af7d36ee1fc15a9b08c0026c4a307746e7a6edcf4d5d65e52900827d34b5c`,
which matched `SHA256SUMS`. After installing that downloaded artifact:

- its private Tesseract and English data read the generated `TEST` fixture;
- package metadata required neither host Tesseract nor host eSpeak NG;
- native eSpeak NG completed in real WebKitGTK with Web Speech absent;
- a second app instance exposed the occupied default shortcut, offered
  `Ctrl+Alt+R`, registered it, and read `NORTH GATE LOCKED / FIND RADIO TOWER`
  exactly once while another window kept focus, in 394 ms;
- the live one-line Linux installer verified the same release checksum and
  completed successfully.

The independent five-title command also passed **25/25** accurate reads under
three seconds:

| Title | Result | Fresh timings (ms) |
| --- | ---: | --- |
| OpenTTD 13.4 | 5/5 | 249, 255, 248, 249, 251 |
| Neverball 1.6.0 | 5/5 | 1,647, 2,723, 1,028, 1,593, 1,611 |
| GNOME Sudoku 46.0 | 5/5 | 258, 286, 268, 245, 273 |
| Pingus 0.7.6 | 5/5 | 295, 689, 484, 585, 383 |
| GNOME Mines 40.1 | 5/5 | 253, 250, 255, 255, 253 |

## Build and automated checks

| Check | Result |
| --- | --- |
| Clean clone and `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 7 tests in 4 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e` | PASS — 25 browser tests |
| `npm run test:claims` | Command PASS — 17/17; one cross-platform claim remains incomplete as described above |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 4 tests |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS |
| `npm run build` | PASS — produced `dist/site/` |
| `CI=1 npm run tauri build` | PASS — produced Debian, RPM, and AppImage |
| `npm run test:bundled-ocr-runtime` | PASS — Debian, RPM, and AppImage OCR; Linux speech |
| `npm run test:linux-package` | PASS — installed package and native WebKitGTK speech |
| `npm run test:linux-hotkey-package` | PASS — conflict, recovery, one real hotkey read |
| `npm run test:compatibility` | PASS — 25/25 across five windowed titles |
| `verify-url.sh` on live root | PASS — 709 ms, no console/page error, required metadata present |

The production site contains 25,281 raw bytes of JavaScript across three
chunks, 11,828 bytes of CSS, no web font, and a 36,440-byte hero image. Fresh
mobile Lighthouse scored **100 performance / 100 accessibility / 100 best
practices / 100 SEO**, with FCP 0.8 s, LCP 1.1 s, TBT 50 ms, and CLS 0.

## Live routes, accessibility, and recovery

- `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown route returns
  the styled shared-shell 404.
- Every route has `lang=en`, one h1, one main landmark, an ordered heading
  outline, and a route-specific title. Normal routes have correct canonicals.
- Playwright Axe found no serious or critical issue on the four normal routes,
  the 404, the desktop shell, or the open capture-frame dialog.
- Keyboard order starts with Skip to content. Focus has a 4 px ochre outline.
  Enter opens the demo, and route changes and browser Back focus the new h1.
- Every visible phone control measured at least 44 × 44 CSS pixels. All tested
  routes had zero horizontal overflow at 390 px and at 200% text size.
- Reduced motion removes the hero animation and reduces residual timing to
  0.01 ms.
- Mocked live-shell checks recovered from a failed settings load, an empty
  hotkey, a failed save, and a failed OCR read without page errors. The real
  packaged-app check covered startup shortcut conflict and recovery.
- Browser responses include CSP, HSTS, `nosniff`, strict-origin referrer
  policy, and restrictive permissions policy. Hashed assets and art are
  immutable for one year; `latest.json` is `no-store`.
- The live Windows, macOS, and Linux user agents each received a visible,
  versioned, real release URL. All live runtime files checked against the
  production build matched byte for byte.
- No analytics, account, payment, cloud OCR, screenshot-upload request,
  third-party font/script, raw model key, or external runtime request was
  observed.

There is no backend, authentication service, payment flow, service worker,
updater, library API, or CLI. Tenant isolation, backend restart persistence,
health, 429/Retry-After, sign-in authority, and offline/update checks are not
applicable. The desktop settings persistence claim is covered by its fresh
local-store test.

## Earlier finding disposition

| Round | Earlier finding | Current disposition |
| --- | --- | --- |
| 1 | Broken claim selectors; no release; dead download; no real frame editor or persistence; leaked temporary capture | Fixed — exact claims run, release/download work, frame and settings tests pass, capture uses RAII cleanup. |
| 1 | Missing OCR dependency; broken installer; desktop contrast/type errors/workflow failure | Fixed — bundled runtimes, checksum installer, Axe, TypeScript, Clippy, and successful release jobs verified. |
| 1 | Focus, touch targets, caching/404 status, walkthrough, and social-card shape | Fixed — route focus, 44 px targets, immutable assets, real 404, three-frame walkthrough, and 1200 × 630 social image verified. |
| 2 | Missing manifest/checksums; clean prerequisite gap; AppImage dependency; small wordmark | Fixed — published metadata, idempotent prerequisite script, bundled Linux runtime, and measured target size pass. |
| 3 | 404 CSP/shared shell and untested controller input | Fixed — same-origin 404 CSS/shared shell and `gamepad-read` test pass. The stale 404 version is a new minor finding. |
| 4 | Pointer-only frame editor and speech cancellation | Fixed — full pointer/keyboard editor and FIFO speech test pass. |
| 5 | Landing preview exception; 200% overflow; missing privacy claims; startup recovery; stale README count | Fixed — no exception, no overflow, claim entries exist, recovery works, and README is current. |
| 6 | Linux WebKitGTK could not speak; package claim was shallow | Fixed — downloaded package completes native speech and package inspection. |
| 7 | False ready state on shortcut conflict; missing real hotkey claim; no five-title evidence | Fixed — real conflict/recovery/hotkey test and 25/25 compatibility run pass. |
| 8 | Windows, macOS, and AppImage lacked bundled OCR | Functionally repaired for the tested MSI, DMG, and AppImage paths; the broader every-package claim remains incomplete for the EXE and app archive. |

## Required next steps

1. Test the installed Windows EXE and extracted macOS app archive with their
   bundled OCR runtime, or stop claiming every released package is covered and
   make the live Windows button select the tested MSI.
2. Update the static 404 footer from `v0.1.6` to `v0.1.10` and add a regression
   that compares its build identifier with the application version.
