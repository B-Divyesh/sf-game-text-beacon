# Game Text Beacon repair handoff

## Status

Repair commits through `654d89e` are pushed to `main`. Release tag `v0.1.1-r4` is building in GitHub Actions at `https://github.com/B-Divyesh/sf-game-text-beacon/actions/runs/33187006463`.

## What changed

- Replaced shallow, unsupported `--grep` claims with executable Playwright and Rust regression checks. The browser tests use a clean `/demo` flow, inspect real localStorage, and intercept every request.
- Implemented an actual desktop frame picker. It hides Beacon briefly, samples the primary display, then lets the player draw, move, and resize the frame before saving it. Region and hotkey are persisted in the app data folder; the default hotkey registers on startup and always reads the current saved region.
- Made private temporary captures RAII-owned, so the PNG is deleted on every OCR exit, including a missing Tesseract executable.
- Declared `tesseract-ocr` as a Debian package dependency. The Linux installer now verifies the downloaded asset's real filename against `SHA256SUMS`.
- Added release prerequisites and a GitHub release action. Updated `xcap` to the compatible 0.4 line after the original macOS release runner exposed an upstream 0.0.14 compiler failure.
- Repaired the dead download state, console-erroring release request, canonical URLs, focus announcements, small touch targets, desktop contrast, cache/404/security policy, social-card dimensions, and desktop walkthrough.

## Verification evidence

- `npm ci` — PASS (101 packages, 0 vulnerabilities before the repair dependency work).
- `npm test` — PASS (4 tests).
- `npm run typecheck` / `npx tsc --noEmit` — PASS.
- `npm run test:e2e` — PASS (9 tests): desktop, 390 px mobile, keyboard, focus restoration, network privacy, all five web claims, and Axe serious/critical checks.
- Each exact claims command in `.factory/claims.json` was invoked. Browser claim selectors passed; `cargo test --manifest-path src-tauri/Cargo.toml claim_desktop_local_ocr` and `claim_saved_region_settings` passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — PASS (2 tests).
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` — PASS.
- `npm run build` — PASS. Production JS is 18.57 KB raw / 6.88 KB gzip and CSS is 10.81 KB raw / 3.24 KB gzip.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4174 <evidence-dir>` — PASS: 200, no console errors, title/lang/one h1/main/alt checks passed. The local Playwright Axe integration passes; the standalone Axe CLI could not start because its Selenium Chrome binary is absent in this worker.
- `npm run tauri build` — PASS after the capture-library compatibility update: AppImage, `.deb`, and `.rpm` were produced. The `.deb` metadata verifies `Depends: tesseract-ocr, libwebkit2gtk-4.1-0, libgtk-3-0`; the final binary stayed open for 10 seconds under Xvfb.

## Deployment and release

- Static deployment is triggered by the pushed `main` branch. At this handoff update, `https://game-text-beacon.sociobot.in` still serves the prior asset hash; recheck after the factory deployment completes.
- Earlier release attempts exposed an upstream `xcap 0.0.14` macOS compiler break, then missing macOS universal Rust and Windows icon inputs. `v0.1.1-r4` uses `xcap 0.4`, installs both macOS targets, and ships generated `.ico`/`.icns` assets; it is the release to verify.
- The static landing page deliberately keeps the download control hidden until a same-origin `latest.json` is published, avoiding the previous GitHub API 404 console error. After the release assets finish, update `public/latest.json` with the release asset URLs and push so the deployed download button becomes live.

## Operator action

Packages are intentionally unsigned. macOS notarization needs `APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX`. No updater is shipped and no telemetry is included.
