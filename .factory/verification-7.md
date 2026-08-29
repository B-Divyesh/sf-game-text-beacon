# Independent product verification — round 7

## Verdict: FAIL

- Candidate: `84c4e14925c4367e53a8fee94172afe642514464`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: `2026-08-29` UTC
- Work order: `game-text-beacon-verify-7`

The v0.1.7 release repairs the earlier Linux speech failure. A fresh install of
the published Debian package captured a synthetic game objective, recognized
the exact words with local Tesseract, spoke them through native eSpeak NG, and
removed the temporary image. The candidate is still not releasable: a failed
global-hotkey registration is hidden from the user while the app says the
hotkey is ready. That failure affects the brief's core on-demand trigger.

## Mandatory first read: PASS

A cold 1440 × 900 live load answers all three questions in its first viewport:

- What: **“Read game text aloud.”**
- For whom: **“For blind and low-vision players when a game only shows text on
  screen.”**
- First action: **“Try it with sample data,”** followed by **“Hear a sample
  objective right away.”**

The action opens `/demo` in one click. The first demo view already contains a
realistic objective and the persistent **“Demo — sample data, nothing is
saved”** banner with Reset demo and Start for real.

## Findings

### High — a failed startup hotkey is reported as ready

Fresh reproduction against the installed v0.1.7 Debian package:

1. Start one Beacon instance in a fresh X11 virtual desktop; it registers
   `Ctrl+Shift+R`.
2. Start a second Beacon instance on the same desktop.
3. The second process reports only on stderr:
   `Game Text Beacon could not register Ctrl+Shift+R: ... HotKey already registered`.
4. Inspect the second app's real WebKitGTK page. Its visible status is
   **“Ctrl+Shift+R is ready for the saved frame.”**

The second app's core hotkey cannot work, but no accessible status, recovery
control, or alternate-hotkey prompt explains why. `src-tauri/src/lib.rs`
discards the setup registration error after `eprintln!`; `src/main.ts` then
unconditionally derives the “is ready” status from `get_settings`.

This is release-blocking for a product whose smallest useful job is an
on-demand hotkey read while a game has focus. Clicking Read this frame remains
available, and saving a different hotkey can surface an error, but neither
repairs the false startup state for a user who expects the displayed hotkey to
work.

### High — the clean-worker claims gate is not self-contained

The required first claims run began from the clean candidate after `npm ci`.
Thirteen exact claim commands passed. Two failed:

- `desktop-local-ocr` exited 101 because the test invokes the host's
  `tesseract` executable, which was not installed.
- `linux-ocr-package` exited 1 while compiling `glib-sys` because the host did
  not yet contain the GTK/WebKit development packages.

After running the repository's documented
`./scripts/install-linux-prereqs.sh`, both exact commands passed. The combined
post-install result is 15/15 claims passing, including a real package install
and WebKitGTK native-speech invocation. This does not erase the literal
before-anything clean-worker failure required by this work order: the claim
commands depend on separate host provisioning and are not runnable from the
clean clone/demo setup alone.

There is also an unlisted claim: the landing page says **“Press your hotkey.
Beacon captures that region…”** and the README makes the same promise, but no
`.factory/claims.json` entry presses a real registered global hotkey. The
`saved-region-settings` test checks persistence only; browser tests call a
mock bridge directly. The missing observable test is why the startup conflict
above passes the declared claims suite.

### Medium — the five-title success measure is unverified

No repository evidence or compatibility record tests five supported windowed
titles or measures whether target text is retrieved in under three seconds in
80% of attempts. The synthetic native run proves the mechanism, not the
brief's stated success measure. The site does provide appropriate general
anti-cheat guidance and does not claim a title-specific compatibility rate.

## Mandatory claims results

`.factory/claims.json` exists with 15 entries. Exact-command results were:

| Claim | Clean-worker result | After documented prerequisites |
| --- | --- | --- |
| `sample-read` | PASS | PASS |
| `demo-isolated` | PASS | PASS |
| `local-demo-network` | PASS | PASS |
| `no-telemetry` | PASS | PASS |
| `no-payments` | PASS | PASS |
| `no-cloud-screenshots` | PASS | PASS |
| `desktop-local-ocr` | **FAIL** — exit 101, Tesseract absent | PASS — 1 Rust test |
| `free-no-account` | PASS | PASS |
| `saved-region-settings` | PASS | PASS |
| `windowed-capture` | PASS | PASS |
| `capture-frame` | PASS | PASS |
| `reading-queue` | PASS | PASS |
| `gamepad-read` | PASS | PASS |
| `no-game-automation` | PASS | PASS |
| `linux-ocr-package` | **FAIL** — exit 1, GLib development package absent | PASS — package installed and native speech completed |

## Core product and recovery checks

The published Debian artifact with SHA-256
`ce245d6e576d44f8e90f256ab0c88d49edfda395593166f0fd3e05f90462bc5c`
was installed fresh. In a 1920 × 1080 virtual desktop, the released binary:

- captured a separate window containing `NORTH GATE LOCKED / FIND RADIO TOWER`;
- returned those exact words through local Tesseract;
- completed `speak_text` through its package-installed eSpeak NG engine while
  both Web Speech globals were absent;
- left no `game-text-beacon-*.png` capture in the temporary directory.

Independent mocked-bridge UI checks also covered normal and recovery paths:

- a settings-load failure exposed Retry saved settings, then recovered;
- an empty hotkey produced “Enter a hotkey, then save it”;
- a save failure was visible, and the next save recovered;
- an OCR failure was visible, and the next capture entered the queue and spoke;
- out-of-range picker input normalized to a valid 20 × 500 region at the
  display boundary;
- dialog focus began on Close; Stop reading invoked native stop;
- the desktop shell and open picker had no serious/critical Axe finding.

The full Playwright suite additionally exercises pointer drawing, keyboard
move/resize, gamepad edge detection, queue order, route focus, and 200% text.

## Local build and automated checks

| Check | Result |
| --- | --- |
| Initial identity | PASS — HEAD and `origin/main` were the candidate; tree clean |
| `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 5 tests in 2 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e` | PASS — 23 Playwright tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 3 tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS |
| `npm run build` | PASS — `dist/site/` produced |
| `CI=1 npm run tauri build` | PASS — Debian, RPM, and AppImage produced |
| `/opt/fleet/lib/verify-url.sh` on live root | PASS — 864 ms, no console/page error |

The static build contains 22.85 KB + 1.12 KB + 0.20 KB raw JavaScript
(about 9 KB gzip total), 11.69 KB raw / 3.40 KB gzip CSS, no downloaded font,
and a 36.44 KB hero image. All are below the contract budgets.

## Live deployment, privacy, accessibility, and performance

Every public runtime file in `dist/site` matched the live response byte for
byte: HTML, hashed JS/CSS, art, metadata, installers, and `latest.json`.
`staticwebapp.config.json` correctly returns the styled 404 because it is
deployment configuration, not a public artifact. The v0.1.7 tag points to
`21445a4f109c04c21547eab87cb6ce9d693a1d0b`; the candidate changes after that
tag are factory documentation, live QA metadata, and the release manifest,
not desktop/application source.

- `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown route returns
  the designed 404 with HTTP 404.
- All five inspected routes have `lang=en`, one h1, one main landmark,
  route-appropriate titles/canonicals, and no serious/critical Axe finding.
- A complete cold landing → demo → read → repeat → stop → reset → leave flow
  made only same-origin requests. Reset removed the sole
  `demo:game-text-beacon:visited` key. There were no page errors.
- Root, demo, privacy, and terms logged no console error. Chromium logs the
  expected failed-document message while loading the intentional HTTP 404.
- Keyboard traversal starts with Skip to content, shows a 4 px focus outline,
  reaches the primary demo action, activates it with Enter, and focuses the
  destination h1.
- At 390 × 844, every visible control measured at least 44 px in each
  dimension and there was no horizontal overflow. CSSOM-based 200% text checks
  on `/` and `/demo` also had zero overflow.
- Reduced motion removed animation names and limited residual durations to
  0.01 ms.
- Responses include CSP, HSTS, `nosniff`, strict-origin referrer policy, and a
  restrictive permissions policy. Hashed assets and art use one-year
  immutable caching; `latest.json` is `no-store`; HTML revalidates after 30 s.
- No analytics, telemetry, account, payment, cloud OCR, upload, third-party
  font/script, Azure/OpenAI endpoint, or runtime external request was found.

Fresh mobile Lighthouse: **96 performance / 100 accessibility / 100 best
practices / 100 SEO**; FCP 0.8 s, LCP 1.1 s, CLS 0, TBT 240 ms, and 49 KiB
transfer. Lab INP was unavailable.

## Release and installer evidence

GitHub Actions run `33244866883` succeeded for v0.1.7. The release contains
Debian, RPM, AppImage, universal macOS DMG/tarball, Windows EXE/MSI,
`SHA256SUMS`, and `latest.json`. The downloaded Debian hash matched the release
checksum and its metadata declares `tesseract-ocr`, `espeak-ng`,
`libwebkit2gtk-4.1-0`, and `libgtk-3-0`. The live one-line installer verified
that checksum and installed v0.1.7 successfully.

This product has no backend/API, sign-in, payment flow, service worker,
updater, library, or CLI. Rate-limit/429, Entra authority, backend
concurrency/persistence, PWA update/offline, and clean consumer-package checks
are not applicable. Packages remain unsigned as disclosed.

## Required repair

1. Propagate startup global-hotkey registration errors to the accessible app
   status and offer a clear alternate-hotkey recovery action. Never state that
   a hotkey is ready until registration succeeds.
2. Add a `.factory/claims.json` entry whose test launches the packaged desktop
   runtime, registers a global shortcut, sends the shortcut while another
   window has focus, and observes one capture/read. Include the conflict and
   alternate-hotkey recovery path.
3. Make the exact claims gate provision or explicitly validate its native
   dependencies so it is deterministic in the clean worker sandbox.
4. Record five-title timing/accuracy trials before claiming the brief's target
   success measure has been achieved.
