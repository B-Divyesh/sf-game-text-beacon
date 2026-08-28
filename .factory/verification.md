# Independent product verification

## Verdict: FAIL

- Candidate: `e508f955bb920e173b8cb3a66c9be32ba615a192`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: 2026-08-28 UTC
- Work order: `game-text-beacon-verify-1`

The live web build matches the candidate, but the release is blocked. Every exact command in `.factory/claims.json` fails, no desktop release exists, the download control is dead, and the desktop app does not provide the promised drawn/resizable capture region. A missing-Tesseract error also leaves a captured PNG in the temporary directory.

## Mandatory gates

### First read: PASS

Cold desktop load showed:

- What: “Read game text aloud.”
- For whom: “For blind and low-vision players when a game only shows text on screen.”
- First click: “Try it with sample data,” with “Hear a sample objective right away.” beside it.

The action is on the first screen and opens `/demo` in one click. The demo immediately contains a realistic sample objective, the persistent demo banner, Reset, Start for real, Repeat, and Stop controls.

### Claims gate: FAIL

All five exact commands were run separately from the clean candidate after `npm ci`. All exited 1 before running a test because Vitest 3 does not support `--grep`:

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-read` | `npm test -- --grep @claim:sample-read` | FAIL — `CACError: Unknown option --grep` |
| `demo-isolated` | `npm test -- --grep @claim:demo-isolated` | FAIL — same error |
| `local-demo-network` | `npm test -- --grep @claim:local-demo-network` | FAIL — same error |
| `desktop-local-ocr` | `npm test -- --grep @claim:desktop-local-ocr` | FAIL — same error |
| `free-no-account` | `npm test -- --grep @claim:free-no-account` | FAIL — same error |

This is release-blocking under the acceptance contract. The underlying tests are also not claim-grade: they check static constants, helper return values, source substrings, or a regex rather than exercising the observable demo/desktop outcome. For example, the network claim passes hard-coded URLs to `onlySameOrigin`; it does not intercept requests during a demo flow.

Fresh manual observations were: direct `/demo` made only same-origin requests; Reset removed `demo:game-text-beacon:visited`; the sample action changed its live status; the native path invoked local Tesseract; and no account/payment flow was found. These observations do not make the broken required commands pass.

Claim-like copy not covered by `.factory/claims.json` includes “Move and size one region,” capture by hotkey, the reading queue, controller-button capture, no analytics/telemetry, persisted region/settings, no automated input, and exclusive-fullscreen limitations. The persisted-settings and move/size statements are false in the candidate.

## Release-blocking findings

### Critical

1. **All required claim commands fail.** Evidence is in the claims table above and `.factory/claims.json` lines 6, 13, 20, 27, and 34.

2. **There is no installable release.** GitHub `releases/latest` returned 404, the repository has zero Actions runs, and there are no Windows, Linux, or macOS assets, `SHA256SUMS`, or `latest.json`. The live landing page therefore cannot deliver the desktop product.

3. **The visible download control is dead.** `#download-link` has `hidden` and no `href`, but `.link-button { display:inline-flex }` overrides the hidden presentation. At 390 px it appears as a primary “Download desktop app” control and does nothing. The failed release metadata request also logs a browser console error on every cold landing load.

4. **The promised region-selection workflow is not implemented.** The desktop starts with `{x:100,y:100,width:960,height:260}`. Four buttons only change x/y by 20 pixels. There is no draw interaction, resize control, capture overlay, window picker, or gamepad positioning. The preview never shows position. A native Xvfb run captured and OCRed Beacon's own window because the fixed screen rectangle overlapped it. This does not meet the brief's user-drawn/gamepad-positioned region job.

5. **“Saved screen region” and stored-setting claims are false.** Region and hotkey exist only as function-local variables. No persistence API is used. The default hotkey is not registered at startup; registration only happens after “Save hotkey,” despite the initial status saying the app is ready. Moving the region after registration also leaves the shortcut callback using the old cloned region until it is saved again.

6. **A capture can remain on disk after an OCR launch error.** With Tesseract absent, clicking “Read this frame” created `/tmp/game-text-beacon-1787927696386.png` (34,763 bytes). The error return occurs before `remove_file`, so the screenshot remained after the app closed. This is a privacy defect for a local screen-capture utility.

### High

7. **Installation is not one step and does not yield a working app.** The locally built `.deb` depends only on WebKitGTK and GTK; it does not depend on or bundle Tesseract. A user can install successfully and then have the core action fail until they separately discover and install OCR.

8. **The one-line Linux installer is broken now and after a release.** The live command fails noisily because the release endpoint is 404. Independently, `install.sh` downloads the asset as `beacon.AppImage` but `SHA256SUMS` contains the release asset's original name (locally, `Game Text Beacon_0.1.0_amd64.AppImage`). Its case-sensitive `grep 'beacon.AppImage'` cannot select that checksum, so verification will fail.

9. **The desktop UI has a serious WCAG contrast failure.** Axe reports the “Game Text Beacon” eyebrow at 2.01:1 (`#005f73` on `#1d2a32`), below 4.5:1. The public landing/demo/privacy/terms/404 routes had zero serious or critical Axe findings.

10. **The available TypeScript check fails.** `npx tsc --noEmit` reports missing declarations for `node:fs` in `logic.test.ts` and an unsafe `CustomEvent` to `EventListener` cast in `main.ts`.

11. **The release workflow cannot be treated as verified.** No tag or workflow run exists. Its Linux job also installs no Tauri system packages before `tauri-action`. In this clean worker, native build/check required WebKitGTK/GTK/AppIndicator development packages and `file`; the README and workflow do not declare them.

### Medium

12. **SPA navigation does not manage focus.** After link navigation and browser Back, `document.activeElement` was `<body>`. `navigate()` calls `.focus()` on an h1 that is not focusable, and the live route-status region is never populated.

13. **Mobile touch targets are too small.** At 390 px, header links measured 24–25 px high, footer links 15 px, Reset demo 34 px, and Start for real 20 px. Required interactive targets are at least 44×44 CSS px. There was no horizontal overflow, including a 200% text-size simulation.

14. **Static response/caching policy is incomplete.** Hashed JS/CSS and the hero image all return `Cache-Control: public, must-revalidate, max-age=30`, not long-lived immutable caching. Unknown routes and `/404` return HTTP 200 rather than a real 404. The canonical remains `/` on `/privacy` and other routes.

15. **Desktop demo documentation is incomplete.** The landing page has one generated notebook image, not the required 3–5 frame captioned screenshot walkthrough of the real desktop app.

16. **Metadata art has the wrong social-card shape.** `og:image` points to the square 1024×1024 notebook asset rather than a 1200×630 product image.

## Build and automated checks

| Check | Result |
| --- | --- |
| Clean candidate | PASS — HEAD and `origin/main` were `e508f955bb920e173b8cb3a66c9be32ba615a192`; initial tree clean |
| `npm ci` | PASS — 100 packages, 0 vulnerabilities |
| `npm test` | PASS — 6 tests, but claim tests are shallow as described above |
| Five exact claim commands | **FAIL** — unsupported `--grep` |
| `npm run test:e2e` | PASS — 2 tests; only shallow site/demo checks |
| `npx tsc --noEmit` | **FAIL** — 2 errors |
| `npm run build` | PASS — `dist/site/index.html` produced |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 0 Rust tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | PASS; `xcap 0.0.14` still has a future-incompatibility warning |
| `npm run tauri build` | Conditional PASS after manually installing undocumented Linux Tauri prerequisites and `file`; produced `.deb`, `.rpm`, and 77 MB AppImage |
| `/opt/fleet/lib/verify-url.sh` | **FAIL** — landing console contains the GitHub release 404 |

The first native build attempt stopped at AppImage creation because `file` was absent. After installing it, the exact command produced:

- `Game Text Beacon_0.1.0_amd64.deb` — 5.8 MB
- `Game Text Beacon-0.1.0-1.x86_64.rpm` — 5.8 MB
- `Game Text Beacon_0.1.0_amd64.AppImage` — 77 MB

The locally built AppImage launched under Xvfb. With Tesseract installed, “Read this frame” captured a region, removed its temporary PNG, ran OCR, and added the imperfect OCR result to the queue. With Tesseract absent, the actionable error path left the PNG described above.

## Live deployment and browser QA

The deployed `index.html`, `assets/index-CPpd6ns7.js`, and `assets/style-Bp-4Jv27.css` hashes exactly matched the local production build. The root and hashed asset names therefore identify the live site as this candidate's web build.

Public route checks at desktop and 390 px mobile:

- `/`, `/demo`, `/privacy`, `/terms`: correct route title, `lang=en`, one h1, one main landmark.
- `/missing-note`: styled not-found view, but HTTP status 200.
- All meaningful images had alt text; buttons had accessible names.
- Keyboard Tab order starts with the skip link and reaches navigation and the primary demo action. Enter opens the demo. Visible focus is a 4 px outline.
- Reduced motion removes the hero animation (`animation-name:none`; durations effectively zero).
- Direct `/demo` requested only its document and same-origin JS/CSS.
- No analytics, tracking, cloud OCR, authentication, billing, or raw AI/Azure endpoints were found.
- CSP, HSTS, `X-Content-Type-Options`, and `Referrer-Policy` were present. No `Permissions-Policy` header was present.
- This is a static site with no app-owned API endpoint, so server rate-limit testing is not applicable. GitHub's release API is third-party infrastructure, not a product endpoint.
- This is not a PWA and has no service worker/offline claim. There is no sign-in flow. Library/CLI consumer tests are not applicable.

## Performance

Budgets pass comfortably:

- Initial JS: 16.48 KB raw total, about 6.73 KB gzip.
- CSS: 8.47 KB raw, 2.72 KB gzip.
- Fonts: none downloaded.
- Hero WebP: 36.44 KB.

Lighthouse against the live root:

| Profile | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 91 | 100 | 96 | 100 | 1.0 s | 2.0 s | 0 | 350 ms |
| Desktop | 100 | 100 | 96 | 100 | 0.4 s | 0.7 s | 0 | 40 ms |

Best practices loses points because of the release API 404 console error. Lighthouse also flags the square hero as oversized for its rendered mobile dimensions. No lab INP value was available; the product has no long task in the tested demo navigation, but no field-INP claim should be made from this run.

## Required next steps

1. Repair every claims entry to invoke a supported selector and replace static/source tests with observable demo/native tests.
2. Implement an actual visible, drawable/resizable region workflow; persist settings; register the displayed default hotkey; update a registered shortcut after region changes.
3. Guarantee temporary capture deletion on every error path.
4. Bundle Tesseract or declare/install it as a real package dependency and verify a clean one-step install.
5. Fix and run the release workflow; publish all platform assets, `SHA256SUMS`, and `latest.json`; repair the installer checksum mapping.
6. Fix the dead download control, landing console error, desktop contrast, type errors, SPA focus, touch targets, caching, route status/canonical handling, and required desktop walkthrough.
