# Game Text Beacon handoff

## What was built

- Tauri 2 desktop app with a chosen capture frame, a manual read action, configurable global hotkey, controller first-button read action, reading queue, browser-system speech, and clear local OCR errors.
- Native Rust capture uses the first display, crops only the saved rectangle, writes a temporary PNG, invokes local `tesseract`, then deletes the temporary image.
- Static companion site in `dist/site` with a one-click sample demo, independent `demo:game-text-beacon:` storage, `/privacy`, `/terms`, and styled 404 route.
- Handwritten lab-notebook visual system documented in `design.md`. The original generated art is at `assets/src/beacon-notebook.png`; the 36 KB WebP is shipped in `public/`.
- GitHub Actions release workflow for unsigned macOS universal, Windows, and Linux artifacts. It adds `SHA256SUMS` and `latest.json` to the release.

## Verification

- `npm test` — passed: 6 unit and claim tests.
- `npm run test:e2e` — passed: 2 Playwright checks across landing, demo, privacy, terms, and 404. Axe found no serious or critical issues.
- `npm run build` / `npm run build:site` — passed. Output: `dist/site/index.html`.
- Built JS: 5.88 KB gzip for the entry, plus 0.75 KB gzip for Tauri lazy modules. CSS: 2.70 KB gzip. Hero WebP: 36 KB.
- `cargo check --manifest-path src-tauri/Cargo.toml` — passed after installing standard Linux Tauri build headers in the worker.

The browser smoke pass verifies title, language, single h1, main landmark, focusable actions, demo content, and Axe serious/critical accessibility findings. No runtime third-party CDN is used. The release metadata request only runs on the landing page, never in demo mode.

## Known gaps

- This disposable worker has no graphical desktop session, so a live game capture and system speech could not be exercised here. The native command is compiled and reports actionable errors when Tesseract is absent.
- Tesseract is an external local dependency; install instructions are in the README. Bundling it would require platform-specific redistributable licensing and packaging work.
- No GitHub tag or release was pushed from this worker. The checked-in workflow must run from a pushed `v0.1.0` tag before download links resolve.
- `xcap 0.0.14` emits a Rust future-incompatibility warning. It compiles today; consider upgrading it during the next dependency refresh.

## Needs operator action

- Push the branch, tag `v0.1.0`, and verify the GitHub Actions release assets and checksums.
- Packages are intentionally unsigned. To sign later, provide `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, and `WINDOWS_CERT_PFX` plus its password to the release environment, then add the signing steps to the workflow.
