# Independent product verification — round 5

## Verdict: FAIL

- Candidate: `4f318b35a4a0c696fd8b67401730f03530cb2a63`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: 2026-08-29 UTC
- Work order: `game-text-beacon-verify-5`

The live deployment matches the candidate's production site and the published
desktop release is installable. All 12 declared claim commands pass after the
clean lockfile install. The candidate still fails the acceptance contract:
one visible landing-page action throws an uncaught error, the public pages do
not reflow at 200% text size, and the claim inventory/tests do not cover or
prove all published privacy and input-method promises.

## Mandatory first read: PASS

A cold 1440 × 900 live load answers all three questions in the first screen:

- What: **“Read game text aloud.”**
- For whom: **“For blind and low-vision players when a game only shows text on screen.”**
- First action: **“Try it with sample data,”** followed by “Hear a sample objective right away.”

One click opens `/demo`. The sample objective is already present, and the
persistent **“Demo — sample data, nothing is saved”** banner includes Reset
demo and Start for real. Read, Repeat, Stop, Reset, and Start for real all
worked. Reset removed the only demo key,
`demo:game-text-beacon:visited`.

## Mandatory claims gate

After `npm ci` from the untouched candidate, every exact command in
`.factory/claims.json` passed independently.

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-read` | `npm run test:e2e -- --grep @claim:sample-read` | PASS — 1 test |
| `demo-isolated` | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS — 1 test |
| `local-demo-network` | `npm run test:e2e -- --grep @claim:local-demo-network` | PASS — 1 test |
| `desktop-local-ocr` | `cargo test --manifest-path src-tauri/Cargo.toml claim_desktop_local_ocr` | PASS — 1 test |
| `free-no-account` | `npm run test:e2e -- --grep @claim:free-no-account` | PASS — 1 test |
| `saved-region-settings` | `cargo test --manifest-path src-tauri/Cargo.toml claim_saved_region_settings` | PASS — 1 test |
| `windowed-capture` | `cargo test --manifest-path src-tauri/Cargo.toml claim_windowed_capture` | PASS — 1 test |
| `capture-frame` | `npm run test:e2e -- --grep @claim:capture-frame` | PASS — 1 test |
| `reading-queue` | `npm run test:e2e -- --grep @claim:reading-queue` | PASS — 1 test |
| `gamepad-read` | `npm run test:e2e -- --grep @claim:gamepad-read` | PASS — 1 test |
| `no-game-automation` | `npm run test:e2e -- --grep @claim:no-game-automation` | PASS — 1 test |
| `linux-ocr-package` | `npm run test:e2e -- --grep @claim:linux-ocr-package` | PASS — 1 test |

The wider claims audit still fails:

- README says **“No telemetry … or payment … is included”**, and the landing
  and privacy pages say screenshots are not sent to a cloud service. There is
  no telemetry, payment, or cloud-screenshot-upload claim entry/test. The demo
  network claim covers only the web demo.
- `desktop-local-ocr` promises that the native capture invokes Tesseract and
  contains no HTTP endpoint. Its test supplies a fake `RecordingLocalOcr`; it
  never invokes `CommandLocalOcr`, `tesseract`, `capture_and_ocr`, or observes
  native network behavior.
- `capture-frame` specifies pointer and keyboard draw/move/resize in its
  sandbox. Its claim test performs one pointer click and cancels, then proves
  only the keyboard edit path. Independent pointer drawing did change all four
  region values, but the required claim test does not prove pointer draw,
  move, and resize as declared.

Under the supplied claims contract, unlisted claim-like copy and a claim test
that does not assert its stated sandbox are release-blocking even when the
commands exit successfully.

## Release-blocking defects

### High — the landing preview action throws an uncaught error

On the live home page, clicking the visible **Read sample objective** button
produced:

```text
pageerror: Cannot set properties of null (setting 'textContent')
```

The page has no `.status` element, but `speak()` always calls `status()`, which
dereferences that missing node. The action gives no announced reading state;
headless Chromium also reported `speechSynthesis.speaking === false`. The
error reproduces on the deployed candidate and is absent from the automated
suite because only the demo's similarly named button is exercised. This
violates the no-console/page-errors and immediate-feedback requirements.

### High — 200% text size breaks mobile reflow

At a 390 CSS-pixel viewport with the browser default text size doubled:

- `/` became **664 px** wide.
- `/demo` became **424 px** wide.

Both pages therefore require horizontal as well as vertical scrolling. On the
landing page, the unbreakable published Debian filename makes
`#download-status` 636 px wide inside a 334 px box. On the demo, grid children
retain a 400 px minimum content width. This fails the supplied requirement
that text resize to 200% without loss and is especially material for the
product's low-vision audience.

### High — claim inventory and claim sandboxes are incomplete

The unlisted and under-proved claims above fail the explicit “every claim is a
test” acceptance gate. Source review found no telemetry, payment, cloud OCR,
or screenshot-upload implementation, so this is a verification-contract
defect rather than evidence that data is currently exfiltrated.

### Medium — desktop settings-init failure has no recovery state

With the desktop bridge's initial `get_settings` request rejected, the shell
emitted an unhandled page error and remained on **“Loading saved settings.”**
The initial await is outside a `try` block. Later invalid-input and capture
errors are handled correctly, but this startup boundary is not.

### Low — README has a stale native-claim count

README says “The two native claim commands,” while `.factory/claims.json`
contains three native Cargo claim commands.

## Build and automated evidence

| Check | Result |
| --- | --- |
| Clean source identity | PASS — initial `HEAD` and `origin/main` were the candidate; tree was clean |
| `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 5 tests in 2 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e` | PASS — 16 Playwright tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 3 tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS after the documented prerequisite script |
| `npm run build` | PASS — `dist/site/` produced |
| `CI=1 npm run tauri build` | PASS — `.deb`, `.rpm`, and AppImage produced |
| `verify-url.sh` local and live | PASS — title, lang, one h1, main, alt text, and cold-load console check |

The exact native build produced a 6,553,974-byte Debian package, a
6,555,809-byte RPM, and an 80,718,328-byte AppImage. The local Debian metadata
declares `tesseract-ocr`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0`.

## Functional, accessibility, and error-path evidence

- Desktop and 390 px live layouts have no overflow at normal text size; every
  visible landing interactive target at 390 px measured at least 44 × 44 CSS
  px.
- Keyboard order starts with the skip link, reaches every landing control,
  and shows a 4 px ochre focus outline. Enter opens the demo. Route changes
  and Back focus the new h1.
- Live Axe scans at desktop and 390 px found zero serious/critical violations
  on `/`, `/demo`, `/privacy`, `/terms`, and the 404. The mocked desktop shell
  and open frame dialog also had zero serious/critical findings.
- Reduced motion changes all animation and transition durations to 0.01 ms;
  no continuing animation remained.
- A mocked desktop run successfully drew a frame with the pointer, exercised
  the keyboard picker, dismissed the modal with Escape, rejected an empty and
  invalid hotkey with actionable messages, recovered from a failed OCR read,
  and then added recovered text to the queue.
- A settings-load rejection was not recovered, as documented above.
- The real release binary launched under Xvfb with its local shell and saved
  frame UI. Bare-Xvfb synthetic activation did not dispatch the read action,
  so no claim of a full native OCR click-through is based on that smoke test;
  the native OCR, persistence, capture bounds, and UI bridge are covered by
  the passing component and Playwright tests.

## Privacy, security, and deployment evidence

- A fresh direct `/demo` load requested only its document and same-origin
  hashed JS/CSS. The complete sample flow made no third-party request and had
  no console/page error.
- Source review found no analytics, telemetry SDK, account, payment flow,
  cloud OCR call, Azure/OpenAI key, or screenshot-upload endpoint. The only
  site fetch is same-origin `/latest.json`.
- Live headers include HSTS, CSP, `nosniff`, strict-origin referrer policy, and
  a permissions policy disabling camera, microphone, geolocation, and
  payment. Hashed assets and the hero use one-year immutable caching;
  `latest.json` is `no-store`; HTML revalidates after 30 seconds.
- `/missing-note` returns a real HTTP 404 with the styled shell. The expected
  DevTools failed-resource message for the 404 document is not an application
  script error.
- Byte-for-byte SHA-256 matches were obtained between the candidate build and
  live `index.html`, JS, CSS, release manifest, hero, installers, and 404
  assets. Live JS SHA-256 is
  `628d0b0b1767ae2522e6fd473a216e51028b68072ec0bc53550bc8cb9897bca8`.

There is no product server/API endpoint, sign-in, payment, service worker,
updater, library, or CLI. Rate-limit/429, Entra authority, backend concurrency,
offline-PWA update, and clean consumer-package checks are therefore not
applicable.

## Release and installer evidence

GitHub release `v0.1.5` contains Windows EXE/MSI, macOS universal DMG/tarball,
Linux Debian/RPM/AppImage assets, `latest.json`, and `SHA256SUMS`. The
downloaded Debian package SHA-256 was:

```text
1a4cb2e658e4a139021b667a90aafa858d721d9a714b59c07b54df1ed263308d
```

It exactly matched `SHA256SUMS`. Running `public/install.sh` in this clean
container verified that checksum, installed package version `0.1.5`, and left
`/usr/bin/game-text-beacon` plus Tesseract 5.3.4 available. The live Linux
download chooses this Debian asset.

## Performance and budgets

Lighthouse mobile against the live root scored **93 performance / 100
accessibility / 100 best practices / 100 SEO**. FCP was 0.9 s, LCP 1.1 s,
CLS 0, TBT 330 ms, and total transfer 48 KiB. A lab INP value was not
available.

The production build contains 21.47 KB raw / 7.75 KB gzip initial JS and
11.48 KB raw / 3.33 KB gzip CSS. It downloads no font. The hero WebP is
36.44 KB. These pass the stated static budgets.

## Required repairs

1. Make the landing preview reading action update a real live status node and
   add an interaction regression that rejects console/page errors.
2. Reflow all public routes at 200% text size; allow long release filenames to
   wrap and prevent grid children from imposing a viewport-wide minimum.
3. Add claim entries/tests for telemetry, payment, and cloud screenshot
   promises, or remove those promises. Make native OCR and pointer claim tests
   exercise the sandboxes they describe.
4. Catch initial desktop settings-load failure and show a usable retry/default
   recovery state.
5. Correct the README's native claim count.
