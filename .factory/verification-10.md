# Verify Game Text Beacon reads game text aloud — round 10

## Verdict: FAIL

- Findings: **1** (1 low)
- Untested claims: **0**
- Implementation candidate: `f8e4d449e7b2249a2bc42ac769964c443f83145a`
- Documentation reviewed: `be4ea2089c99454a389253aa3208b98c3c34a390`
- Release: `v0.1.11`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: `2026-09-06` UTC
- Work order: `game-text-beacon-verify-10`

Game Text Beacon reads a chosen game-screen region aloud for blind and
low-vision PC players. Before scrolling, fresh desktop and 390 px phone
browsers showed **Read game text aloud**, named that audience, and presented
**Try it with sample data** as the first action.

The release, native package paths, claims, core desktop job, live site, and all
earlier findings pass. Acceptance still fails because leaving the demo through
**Start for real** does not discard the demo namespace as required by the demo
sandbox contract. Any finding prevents a PASS.

## Finding

### Low — Start for real leaves demo state behind

From a fresh browser context, direct `/demo` wrote only
`demo:game-text-beacon:visited=true`. Clicking **Start for real** returned to
`/`, but that key remained unchanged. No real-data key was read or changed,
and **Reset demo** correctly removes the key.

The result is low impact because the retained value is an unused demo marker,
not a capture, setting, or real record. It still conflicts with the required
demo behavior that leaving demo mode discards demo data. The exit link in
`src/main.ts:56` has no cleanup handler; cleanup exists only on Reset at
`src/main.ts:106`.

Required repair: clear the `demo:game-text-beacon:` namespace when **Start for
real** is used, and add a browser test that exits directly without first using
Reset.

## First screen and demo evidence

- Desktop 1440 × 900: the job, audience, and primary sample action were fully
  inside the initial viewport, with no console or page error.
- Phone 390 × 844: the same three elements were fully inside the initial
  viewport, with no overflow or sub-44 px visible control.
- One click opened `/demo` with the populated radio-tower objective and the
  persistent **Demo — sample data, nothing is saved** banner.
- Read, Repeat, and Stop produced the visible statuses **Sample objective is
  reading**, **Repeating sample objective**, and **Reading stopped**. The
  banner remained present throughout.
- Reset removed the demo key. A separately seeded
  `game-text-beacon:real-settings=KEEP` key and an unrelated key remained
  unchanged through entry, reading, reset, and exit.
- Direct `/?demo=1` normalized to `/demo` with the correct title, h1, banner,
  and sample.

## Declared claims

After `npm ci` and the documented Linux prerequisite installer in a clean
clone at the documentation SHA, `npm run test:claims` executed every exact
command in `.factory/claims.json` and reported **PASS 17/17**.

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-read` | PASS | The bundled objective entered the announced reading state. |
| `demo-isolated` | PASS | The active demo used only its prefixed key and Reset removed it. The direct-exit contract issue is the finding above. |
| `local-demo-network` | PASS | The complete demo request log was same-origin. |
| `no-telemetry` | PASS | Landing-to-demo use made no third-party request. |
| `no-payments` | PASS | The sample required no account, checkout, or payment request. |
| `no-cloud-screenshots` | PASS | The frame preview used only the local desktop bridge. |
| `desktop-local-ocr` | PASS | The native runner invoked local Tesseract and removed its private capture. |
| `bundled-ocr-runtime` | PASS | Debian, RPM, and AppImage read `TEST`; successful native CI jobs cover MSI, EXE, DMG, and app archive. |
| `free-no-account` | PASS | The sample opened without authentication. |
| `saved-region-settings` | PASS | Changed frame and hotkey values survived a fresh store. |
| `windowed-capture` | PASS | Partial bounds were clamped and an off-display frame was rejected. |
| `capture-frame` | PASS | Pointer and keyboard draw, move, resize, and save completed. |
| `reading-queue` | PASS | Two reads reached native speech in order; Stop called the native stop path. |
| `gamepad-read` | PASS | One held first-button press produced exactly one capture and result. |
| `no-game-automation` | PASS | The read flow issued no game-control command. |
| `linux-ocr-package` | PASS | An installed package used bundled OCR and native speech without Web Speech. |
| `packaged-global-hotkey` | PASS | A startup conflict was announced, an alternate recovered, and one real shortcut read completed in 264 ms. |

The claim inventory covers the reliance-bearing landing, README, privacy, and
desktop statements. No public claim remains untested. The first attempted
aggregate run occurred before dependencies had been installed inside the
disposable clone and stopped at `vite: not found`; after running the documented
`npm ci` in that clone, the complete sequence above passed. No source was
changed.

## Installed release and compatibility

GitHub Actions run `34018537784` is successful at the implementation candidate
for Ubuntu, Windows, macOS, and manifest publication. The Windows native job
installed and exercised both MSI and EXE OCR payloads. The macOS job mounted
the DMG and extracted and exercised the app archive. Release `v0.1.11` has all
seven platform assets plus `SHA256SUMS` and `latest.json`; every manifest URL
returned 200.

Independent consumer checks used the published Debian file, not only a local
build:

- SHA-256 `0fce9a967c538cf41321d14b945fef70e3df4f0946e0150f55b3301719450764`
  matched `SHA256SUMS`.
- Package metadata reported version 0.1.11 and no host Tesseract or eSpeak NG
  dependency.
- The private Tesseract runtime read `TEST` with a stripped environment; the
  private eSpeak NG runtime produced a valid WAV.
- The installed app completed native speech in real WebKitGTK with Web Speech
  absent.
- Two installed instances exposed the default-hotkey conflict, the alternate
  recovered, and a separate focused window was read exactly once in 269 ms.
- The live `install.sh` downloaded, checksum-verified, and installed the same
  release successfully.

The published Windows EXE and macOS app archive also matched their release
checksums. Archive inspection found the macOS Tesseract executable, runtime
manifest, and English data; their actual runtime execution is covered by the
successful native release jobs.

The independent five-title command passed the brief's 80% per-title threshold:

| Windowed title | Accurate reads under 3 seconds | Timings (ms) |
| --- | ---: | --- |
| OpenTTD 13.4 | 5/5 | 213, 198, 188, 245, 255 |
| Neverball 1.6.0 | 4/5 | 1,080, 3,055, 901, 585, 2,029 |
| GNOME Sudoku 46.0 | 5/5 | 281, 273, 259, 245, 292 |
| Pingus 0.7.6 | 5/5 | 440, 260, 251, 211, 547 |
| GNOME Mines 40.1 | 5/5 | 252, 256, 251, 258, 244 |

Overall: 24/25 accurate reads under three seconds. Neverball still met the
required four-of-five threshold.

## Build and automated gates

| Check | Result |
| --- | --- |
| Clean clone and `npm ci` | PASS — 100 packages, 0 vulnerabilities; clean Git status |
| `npm test` | PASS — 7/7 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — produced `dist/site/` |
| `npm run test:e2e` | PASS — 25/25 browser tests |
| `npm run test:claims` | PASS — 17/17 exact declared commands |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 4/4 tests |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS |
| `npm run test:compatibility` | PASS — 24/25 overall; every title at least 4/5 |
| `/opt/fleet/lib/verify-url.sh` | PASS — 682 ms, required structure, no root errors |

The production build contains 25,281 raw bytes of JavaScript across three
chunks, 11,828 bytes of CSS, no web font, and a 36,440-byte hero image. Fresh
mobile Lighthouse scored **97 performance / 100 accessibility / 100 best
practices / 100 SEO**: FCP 0.9 s, LCP 1.2 s, TBT 180 ms, CLS 0.

## Live routes, accessibility, privacy, and deployment

- `/`, `/demo`, `/privacy`, and `/terms` return 200 with route-specific titles,
  descriptions, canonicals, one h1, ordered headings, and header/nav/main/footer
  landmarks. The deliberately unknown URL returns the designed HTTP 404.
- The 404 has the shared visual shell, a home action, no serious/critical Axe
  issue, and footer `v0.1.11`. Chromium's failed-document message for the
  intentional 404 is expected and is not a finding.
- Live Axe checks found no serious or critical violation on all normal routes,
  the 404, the desktop shell, or the open capture dialog. Focus starts on the
  skip link with a 4 px designed outline. Route changes and Back focus the new
  h1. The dialog initially focuses Close, Escape returns focus to its trigger,
  and keyboard frame editing works.
- All visible controls on the checked 390 px routes and 404 are at least 44 ×
  44 CSS px. Root, demo, privacy, and terms reflow without horizontal overflow
  at 200% text. Reduced motion removes the hero animation.
- Empty hotkey, failed save, failed capture, settings retry, startup shortcut
  conflict, and subsequent recovery paths remained usable and produced no page
  error. Native bounds reject an entirely off-display frame.
- Landing/demo use made only same-origin requests. There is no analytics,
  account, payment, cloud OCR, screenshot upload, third-party font/script,
  raw model key, or external AI request. The AI-leverage review found no useful
  missing AI step; cloud inference would work against the local-first job.
- CSP, HSTS, `nosniff`, strict-origin referrer policy, and restrictive
  permissions policy are live. Hashed assets and art cache immutably for one
  year; `latest.json` is `no-store`.
- All 16 public build files compared byte-for-byte with the production build.
  The live release manifest semantically matches the release copy and selects
  real v0.1.11 EXE, DMG, and Debian assets for Windows, macOS, and Linux.

There is no backend, tenant, account service, payment flow, service worker,
updater, library, or CLI. Backend isolation/restart/health/429 checks, privacy
request processing, authentication authority, and offline/update behavior are
not applicable. Local settings persistence is covered by the fresh-store claim
test. Installers remain intentionally unsigned and the warning is visible.

## Earlier finding disposition

Round 3 was recovered from Git history because its report is no longer present
at HEAD. Every earlier finding, including minor ones, was checked:

| Round | Earlier finding | Current evidence and disposition |
| --- | --- | --- |
| 1 | All claim selectors failed | Fixed — 17/17 exact commands pass. |
| 1 | No release and dead download | Fixed — v0.1.11 assets and all OS-selected links return 200. |
| 1 | No real frame editor; settings/hotkey were not persisted or refreshed | Fixed — pointer/keyboard editor, fresh-store persistence, and packaged shortcut pass. |
| 1 | Failed OCR left a temporary capture | Fixed — RAII cleanup is asserted after the real local OCR path. |
| 1 | OCR was not installed; Linux installer checksum selection was broken | Fixed — bundled runtimes and the live checksum installer pass. |
| 1 | Desktop contrast and TypeScript errors | Fixed — desktop Axe has no serious/critical issue; typecheck passes. |
| 1 | Release workflow prerequisites were missing | Fixed — current Linux, Windows, macOS, and manifest jobs pass. |
| 1 | SPA focus and live announcement were broken | Fixed — navigation and Back focus the h1 and update the live region. |
| 1 | Mobile targets were too small | Fixed — measured controls are at least 44 px. |
| 1 | Cache policy, real 404, and route canonicals were missing | Fixed — immutable caching, designed HTTP 404, and normal-route canonicals pass. |
| 1 | Desktop walkthrough and 1200 × 630 social art were missing | Fixed — three frames and the 1200 × 630 local social image are present. |
| 2 | Manifest/checksums were missing and downloads unavailable | Fixed — published and live v0.1.11 metadata is complete. |
| 2 | Native prerequisites were undocumented | Fixed — the idempotent prerequisite command prepares a clean worker. |
| 2 | Preferred AppImage lacked OCR | Fixed — AppImage bundled OCR and speech execute successfully. |
| 2 | Mobile wordmark target was 25 px | Fixed — it measures at least 44 px. |
| 3 | 404 inline CSS violated CSP and lacked shared shell | Fixed — same-origin CSS, shared structure, and no CSP error. |
| 3 | Controller input and other claims were unlisted | Fixed — controller, automation, and windowed-region claims are listed and pass. |
| 4 | Capture-frame editor was pointer-only | Fixed — keyboard draw/move/resize and focus behavior pass. |
| 4 | New speech cancelled the prior read | Fixed — FIFO native queue and stop pass. |
| 5 | Landing preview threw an uncaught error | Fixed — status updates with no error. |
| 5 | Mobile reflow failed at 200% text | Fixed on all public routes tested. |
| 5 | Privacy/input claims were incomplete | Fixed — claim entries and observable sandboxes pass. |
| 5 | Settings-load failure had no recovery | Fixed — default frame, retry, and recovery pass. |
| 5 | README native-claim count was stale | Fixed — README describes the current commands without a stale count. |
| 6 | Linux WebKitGTK could not speak | Fixed — installed native eSpeak NG succeeds with Web Speech absent. |
| 6 | Linux package claim was shallow | Fixed — it installs and exercises the package. |
| 7 | Startup shortcut conflict falsely reported ready | Fixed — conflict is announced and alternate recovery passes. |
| 7 | Claim setup was not self-contained | Fixed — declared native commands provision documented prerequisites. |
| 7 | Five-title success measure was unverified | Fixed — fresh 24/25 run meets every per-title threshold. |
| 8 | Windows, macOS, and AppImage omitted bundled OCR | Fixed — package payloads and native release checks pass. |
| 9 | EXE and macOS app archive lacked runtime OCR checks | Fixed — both are executed by successful native CI jobs. |
| 9 | 404 footer showed `v0.1.6` | Fixed — built and live 404 show `v0.1.11`. |
