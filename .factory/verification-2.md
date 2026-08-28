# Independent product verification — round 2

## Verdict: FAIL

- Candidate commit: `d4fd29f240f8a02aa2d555e9baeaf09a77d8f93d`
- Candidate source release: `v0.1.1-r5` at `6142dbd4e6fdfb9cb9be9fd53dc4b11c24d4c382`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: 2026-08-28 UTC
- Work order: `game-text-beacon-verify-2`

The deployed static site is the candidate build, not a stale deployment. Its demo, privacy posture, static quality checks, and plain-language first screen are good. The candidate nevertheless fails the desktop-app release contract: the published release has no `SHA256SUMS` or `latest.json`, the same empty manifest is deployed, and no visitor can install the product from the landing page.

## First read: PASS

A cold live load said:

- **What:** “Read game text aloud.”
- **For whom:** “For blind and low-vision players when a game only shows text on screen.”
- **First action:** “Try it with sample data,” followed by “Hear a sample objective right away.”

The action opens `/demo` in one click. It presents a plausible objective, a persistent “Demo — sample data, nothing is saved” banner, Reset demo, Start for real, Repeat, and Stop reading.

## Mandatory claims gate: FAIL

`npm ci` was run first from a clean, clean-status checkout at the stated candidate. Every exact command from `.factory/claims.json` was then run separately.

| Claim | Exact command | Result from clean environment |
| --- | --- | --- |
| `sample-read` | `npm run test:e2e -- --grep @claim:sample-read` | PASS (1 Playwright test) |
| `demo-isolated` | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS (1 Playwright test) |
| `local-demo-network` | `npm run test:e2e -- --grep @claim:local-demo-network` | PASS (1 Playwright test) |
| `desktop-local-ocr` | `cargo test --manifest-path src-tauri/Cargo.toml claim_desktop_local_ocr` | **FAIL** before tests: `glib-2.0 >= 2.70` not found by `pkg-config` |
| `free-no-account` | `npm run test:e2e -- --grep @claim:free-no-account` | PASS (1 Playwright test) |
| `saved-region-settings` | `cargo test --manifest-path src-tauri/Cargo.toml claim_saved_region_settings` | **FAIL** before tests: same missing GLib development dependency |

This is release-blocking under the supplied claims contract. The missing system prerequisites are not installed by the documented clean development flow. After installing the release workflow's Linux GTK/WebKit/AppIndicator/Tesseract prerequisites, `cargo test --manifest-path src-tauri/Cargo.toml` passed (2 tests), `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` passed, and both exact Rust claim selectors passed.

The two native checks also are not sufficient claim tests even when compiled: they test a missing-executable cleanup path and default settings only, not observable local OCR/no-network behavior or persisted settings from a clean desktop run. In addition, visible claims including “Made for windowed games,” choosing/resizing a region, capture by hotkey, the reading queue, and not changing game controls have no individual claim entries and observable sandbox tests. This violates the claims inventory requirement independently of the compilation failure.

## Critical release findings

1. **No verifiable release manifest or checksums; desktop install is unavailable from the live site.**
   - `https://game-text-beacon.sociobot.in/latest.json` exactly matches the candidate's `public/latest.json`: `{"version":"unpublished","assets":{}}`.
   - The live landing page therefore says “Downloads are being published” and keeps its download link hidden for Linux, Windows, and macOS.
   - GitHub's `releases/latest` does have `v0.1.1-r5` platform binaries, but `.../SHA256SUMS` and `.../latest.json` each return HTTP 404. The release API asset list contains neither.
   - The Linux `.deb` was downloaded only for inspection: SHA-256 `320270152f1ff77d870370579d7e8d4d797fee848c4fac0c11d8383d561f952b`; there is no publisher checksum with which to verify it.
   - GitHub Actions run `33187726156` is **failure**. Its create-release and Linux/macOS/Windows build jobs succeeded, but its `manifest` job failed at “Run mkdir release,” so the required release metadata was never uploaded.

2. **Required clean claim commands fail.** See the claims table above. A fresh verifier who follows the documented install path cannot compile either required native claim.

## High findings

1. **The static deployment deliberately matches the empty release state, so this is an actual production defect rather than a deploy lag.** All served candidate assets matched byte-for-byte: `index.html`, all three hashed JS chunks, CSS, images, icons, installers, `latest.json`, `robots.txt`, sitemap, and 404 page. The source-only hosting configuration is correctly not publicly served.

2. **The auto-selected Linux artifact would be the AppImage before the `.deb`, but only the `.deb` declares `tesseract-ocr`.** The landing code prefers `.AppImage`; the published AppImage cannot declare an apt dependency. The web UI does not tell AppImage users they need to install Tesseract. This conflicts with the one-obvious-step, working-install requirement.

3. **The home-wordmark link is only 25 CSS px tall at 390 px mobile.** It is an interactive home control and misses the 44 px target requirement. Other header navigation links and demo controls measured at least 44 px after the repair.

## Functional and quality evidence that passed

- `npm test` — PASS, 4 tests.
- `npm run typecheck` and `npm run lint` — PASS.
- `npm run build` — PASS; `dist/site/` produced. Initial JS is 18.57 KB raw / 6.88 KB gzip; CSS 10.81 KB raw / 3.24 KB gzip; hero WebP 36.44 KB. These meet the stated static bundle budgets.
- `npm run tauri build` — FAIL in this worker because its inherited `CI=1` causes Tauri to reject `--ci 1` (it accepts only literal `true` or `false`). With `CI=true` and the Linux prerequisites installed, the native packaging build completed and produced `Game Text Beacon_0.1.1_amd64.AppImage` (40.4 MB), `Game Text Beacon_0.1.1_amd64.deb` (6.5 MB), and `Game Text Beacon-0.1.1-1.x86_64.rpm` (6.5 MB). GitHub's three r5 platform build jobs likewise succeeded, but that does not repair the failed manifest publication.
- Browser demo flow at 1440 px and 390 px — PASS: no horizontal overflow; primary action, sample read, repeat/stop, Reset demo, and Start for real work; Reset removes the sole `demo:game-text-beacon:visited` key.
- Fresh demo network capture — PASS: no third-party requests, console errors, page errors, or failed requests.
- Playwright Axe scan of local landing page at desktop and 390 px — PASS: zero serious/critical findings.
- Keyboard — PASS: Skip link is first, has a designed 4 px ochre focus outline, moves focus to `main`, and Tab reaches the 46 px primary action. Reduced-motion CSS removes animation/transition motion.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4174 /tmp/verify-url-game-text-beacon` — PASS: 200, title, `lang=en`, one h1, main landmark, no missing image alt text, and no console errors.
- Live routes `/`, `/demo`, `/privacy`, `/terms`, and a missing route — PASS: correct titles/h1/main, with an actual 404 for the missing route and no page errors.
- Live headers — PASS: HTTPS/HSTS, nosniff, strict-origin referrer policy, a restrictive CSP, and permissions policy are present. Hashed JS and the hero use immutable one-year caching; HTML uses 30-second revalidation. There is no app-owned server/API endpoint, sign-in, PWA/service worker, payment flow, or library/CLI API, so rate-limit, Entra, offline-PWA, and consumer-package checks do not apply.
- Privacy source/browser review — PASS for the web demo: no analytics, third-party font/script, cloud OCR endpoint, screenshots upload, raw AI key, account, or billing request. The `.deb` metadata declares `tesseract-ocr`, `libwebkit2gtk-4.1-0`, and `libgtk-3-0`.

## Performance

An idle-worker Lighthouse mobile run against the production build scored 97 performance / 100 accessibility / 100 best practices / 100 SEO, with LCP 1.4 s, CLS 0, and TBT 180 ms. Static bundle sizes are listed above and meet the product budgets.

## Required repairs before acceptance

1. Make the manifest job succeed; publish `SHA256SUMS` and `latest.json` with every platform artifact, update the checked-in/site manifest, and verify that the live OS-selected download link is visible and points to a valid asset.
2. Provide the declared native development prerequisites in the documented clean verification setup, then make all exact claim commands pass from it.
3. Replace source/default-only native claim tests with clean, observable desktop-flow tests, and add entries/tests for every visitor-reliant claim.
4. Ensure the selected Linux install path includes or clearly and automatically installs its required local OCR engine; do not prefer an AppImage that cannot perform the core job after download.
5. Increase the wordmark link's mobile hit area to at least 44 by 44 CSS px.
