# Independent product verification — round 6

## Verdict: FAIL

- Candidate: `593975432ae210cea696889700f62220b85b23d3`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: `2026-08-29T08:28:00Z`
- Work order: `game-text-beacon-verify-6`

The static site, demo, production deployment, release assets, and local OCR all
work. The candidate is not releasable because the published Linux desktop app
cannot speak. Its WebKitGTK runtime does not expose the two Web Speech APIs the
app calls. A real capture reaches local Tesseract and enters recognized text in
the queue, then fails with `ReferenceError: Can't find variable:
SpeechSynthesisUtterance`. Reading text aloud is the product's core job and
Linux is an explicitly supported platform.

## Mandatory first read: PASS

A cold 1440 × 900 live load answers the required questions in the first
viewport:

- What: **“Read game text aloud.”**
- For whom: **“For blind and low-vision players when a game only shows text on
  screen.”**
- First action: **“Try it with sample data,”** with **“Hear a sample objective
  right away”** beside it.

The primary action opens `/demo` in one click. The sample objective is already
present. The persistent **“Demo — sample data, nothing is saved”** banner has
Reset demo and Start for real controls.

## Mandatory claims gate

`.factory/claims.json` exists and contains 15 claims. After `npm ci` and the
repository's documented `./scripts/install-linux-prereqs.sh`, every exact claim
command passed independently:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-read` | `npm run test:e2e -- --grep @claim:sample-read` | PASS — 1 test |
| `demo-isolated` | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS — 1 test |
| `local-demo-network` | `npm run test:e2e -- --grep @claim:local-demo-network` | PASS — 1 test |
| `no-telemetry` | `npm run test:e2e -- --grep @claim:no-telemetry` | PASS — 1 test |
| `no-payments` | `npm run test:e2e -- --grep @claim:no-payments` | PASS — 1 test |
| `no-cloud-screenshots` | `npm run test:e2e -- --grep @claim:no-cloud-screenshots` | PASS — 1 test |
| `desktop-local-ocr` | `cargo test --manifest-path src-tauri/Cargo.toml claim_desktop_local_ocr` | PASS — 1 test |
| `free-no-account` | `npm run test:e2e -- --grep @claim:free-no-account` | PASS — 1 test |
| `saved-region-settings` | `cargo test --manifest-path src-tauri/Cargo.toml claim_saved_region_settings` | PASS — 1 test |
| `windowed-capture` | `cargo test --manifest-path src-tauri/Cargo.toml claim_windowed_capture` | PASS — 1 test |
| `capture-frame` | `npm run test:e2e -- --grep @claim:capture-frame` | PASS — 1 test |
| `reading-queue` | `npm run test:e2e -- --grep @claim:reading-queue` | PASS — 1 test |
| `gamepad-read` | `npm run test:e2e -- --grep @claim:gamepad-read` | PASS — 1 test |
| `no-game-automation` | `npm run test:e2e -- --grep @claim:no-game-automation` | PASS — 1 test |
| `linux-ocr-package` | `npm run test:e2e -- --grep @claim:linux-ocr-package` | PASS — 1 test |

On the untouched worker image, the native OCR claim initially failed because
`tesseract` was not installed. It passed after the documented prerequisite
installer installed Tesseract 5.3.4. The Debian release declares that package
dependency, so installed users receive it.

The passing browser speech tests do not catch the release defect. They replace
`SpeechSynthesisUtterance` and `speechSynthesis` with test doubles in Chromium.
The production Linux app runs WebKitGTK, where both are undefined.

There is also a claim-quality defect: `linux-ocr-package` promises the Linux
download installs Tesseract, but its declared test only supplies a fake
manifest and checks that the landing page chooses a `.deb` link and displays
the promise. It never inspects or installs that package. Independent release
verification showed the real package is correct, but the exact declared test
does not prove its claimed outcome as required by the claims contract.

## Release-blocking defect

### Critical — the Linux desktop app does not read text aloud

Fresh evidence from the published `v0.1.6` Debian package:

1. Downloaded `Game.Text.Beacon_0.1.6_amd64.deb` and matched its SHA-256 against
   the release's `SHA256SUMS`.
2. Installed it with `apt`; package version `0.1.6` and Tesseract 5.3.4 were
   available.
3. Launched `/usr/bin/game-text-beacon` under a 1280 × 900 Xvfb desktop.
4. Clicked **Read this frame**. The native screen capture and local OCR worked;
   recognized text appeared under Reading queue.
5. Used WebKit's remote inspector on that exact running process. It reported
   `typeof window.speechSynthesis === "undefined"` and
   `typeof window.SpeechSynthesisUtterance === "undefined"`.
6. After the read, `#app-status` contained
   `ReferenceError: Can't find variable: SpeechSynthesisUtterance`.

The queue is not an acceptable substitute for speech for blind players. The
Debian package neither includes a native text-to-speech implementation nor a
fallback. This fails the smallest useful product and the headline promise.

## Functional and error-path evidence

- Live landing preview: Read sample objective changes the polite status to
  “Sample objective is reading” with no browser error.
- Complete demo flow: Read, Repeat, Stop reading, Reset demo, and Start for
  real all worked. Reset removed the only key,
  `demo:game-text-beacon:visited`.
- Mocked live desktop bridge: valid settings loaded; empty hotkey produced
  “Enter a hotkey, then save it”; a save succeeded; an OCR rejection was shown;
  the next read recovered and entered text in the queue.
- The frame picker opened with focus on Close. Escape closed it and returned
  focus to Choose capture frame. Pointer draw/move/resize and keyboard
  move/resize are covered by the passing end-to-end claim.
- Native boundary tests clamp a partly off-screen frame and reject a fully
  off-screen frame. Settings persist across a fresh local store.
- The real installed native flow opened a fresh display preview and showed the
  saved frame over that preview.

## Accessibility and responsive checks

- Axe on live `/`, `/demo`, `/privacy`, `/terms`, and the styled 404 found zero
  serious or critical violations.
- Each route has `lang="en"`, one h1, one main landmark, a route-specific title,
  and no missing image alt text.
- Keyboard order starts with Skip to content and reaches navigation, the demo
  action, and preview action. Focus uses a visible 4 px ochre outline. Enter
  opens the demo. SPA navigation and Back move focus to the destination h1.
- At 390 × 844, the landing page has no horizontal overflow and no interactive
  target below 44 × 44 CSS px. Both `/` and `/demo` remain 390 px wide after
  setting the root font to 200%.
- Reduced motion removes the hero animation (`animation-name: none`) and limits
  residual durations to 0.01 ms.
- `verify-url.sh` passes against both the production build preview and live URL.
  Live load was 607 ms with no console/page error on `/`.

## Privacy, security, and deployment evidence

- A cold load and complete landing/demo flow requested only the product origin:
  HTML, hashed JS/CSS, `latest.json`, and the bundled notebook image.
- Source contains no analytics, telemetry, payment, account, cloud OCR, upload,
  Azure/OpenAI endpoint, or runtime network client. The only site fetch is the
  same-origin release manifest.
- Live responses send CSP, HSTS, `nosniff`, strict-origin referrer policy, and a
  permissions policy disabling camera, microphone, geolocation, and payment.
- Hashed JS/CSS and the hero image use one-year immutable caching;
  `latest.json` is `no-store`; HTML revalidates after 30 seconds.
- `/missing-note` is a real HTTP 404 with the styled shared shell. Chromium logs
  only the expected failed-document 404 message on that route.
- Candidate and live SHA-256 hashes match byte for byte for `index.html`, JS,
  CSS, `latest.json`, hero art, both installer scripts, and 404 assets. Live JS
  SHA-256 is
  `fd8501deaaff370385fb48fcf94219e50d4a287ee286fe2687f727fa9e23b790`.

There is no backend/API, sign-in, payment, service worker, updater, library, or
CLI. Rate-limit/429, Entra authority, backend concurrency/persistence, PWA
offline-update, and clean consumer-package checks are not applicable.

## Builds and automated checks

| Check | Result |
| --- | --- |
| Candidate identity | PASS — `HEAD` and `origin/main` were `593975432ae210cea696889700f62220b85b23d3`; tree clean |
| `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 5 tests in 2 files |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:e2e` | PASS — 22 Playwright tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 3 tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings` | PASS |
| `npm run build` | PASS — `dist/site/` produced |
| `CI=1 npm run tauri build` | PASS — Debian, RPM, and AppImage produced |

The static build contains 22.28 KB raw / 7.92 KB gzip initial JS and 11.69 KB
raw / 3.38 KB gzip CSS. It downloads no font. The hero image is 36.44 KB.

## Release and performance evidence

GitHub release `v0.1.6` has Linux Debian/RPM/AppImage, Windows EXE/MSI, macOS
universal DMG/tarball, `latest.json`, and `SHA256SUMS`. The downloaded Debian
asset hash is:

```text
8f5f8a74c1f9c99a7b50029e48e894fc4a37907e50738e2d55c0c86026b8de3c
```

It matches `SHA256SUMS`, installs as version 0.1.6, and declares
`tesseract-ocr`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0` dependencies.

Lighthouse mobile on the live root scored **96 performance / 100 accessibility
/ 100 best practices / 100 SEO**. FCP was 0.9 s, LCP 1.2 s, CLS 0, TBT 220 ms,
and total transfer 49 KiB. Lab INP was unavailable.

## Required repair

Implement and test a Linux-compatible local speech path in the packaged Tauri
app, with an actionable fallback when no voice is available. The claim test
must run against the packaged Linux runtime instead of replacing the speech
APIs with mocks. Also make the `linux-ocr-package` claim test inspect or install
the generated Debian package and assert the Tesseract dependency.
