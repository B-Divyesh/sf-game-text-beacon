# Game Text Beacon repair handoff

## Status

Repair commits through `9835e11` address verifier report `fb2aa46a5a9b1bfa01e6268ce05818c7ab0a17c8`. Release `v0.1.4` completed successfully in GitHub Actions run `33196664822`; the exact checked-in site manifest has been deployed.

## Repairs

- Restored a real cross-platform release: `v0.1.4` includes Linux `.deb`, `.rpm`, and AppImage; macOS universal `.dmg` and app archive; Windows `.msi` and setup `.exe`; plus `SHA256SUMS` and `latest.json`.
- Corrected the workflow manifest root cause. It now checks out the repository before using `gh`, downloads the release into an isolated directory, hashes only packaged desktop assets, and creates deterministic non-null GitHub release URLs.
- Split the native local-capture contract from Tauri/GTK compilation. `cargo test --manifest-path src-tauri/Cargo.toml` now runs its observable native tests without GLib/WebKit development headers; launch/package builds explicitly select the `desktop` feature.
- Added observable Rust contract tests for local OCR cleanup, settings persistence, and bounded capture frames. Browser bridge tests cover saving a selected frame, adding a local reading to the queue, and the absence of game-control commands.
- Corrected Linux delivery: the landing page and installer prefer the Debian package, which declares `tesseract-ocr`; `install.sh` verifies its downloaded checksum before installation. A regression test simulates the installer’s checksum path.
- Expanded the claims inventory and test coverage, raised the 390 px wordmark target to 44 px, and normalized inherited `CI=1` for the Tauri wrapper.

## Verification

From a clean checkout, the following passed:

```sh
npm ci
npm test                    # 5 tests
npm run typecheck
npm run lint
npm run test:e2e            # 14 tests: desktop + 390 px, keyboard, Axe, privacy, claims
cargo test --manifest-path src-tauri/Cargo.toml  # 3 observable native tests
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
npm run build
CI=1 npm run tauri build
```

`npm run build` produced `dist/site/` with 18.84 KB raw JS (6.97 KB gzip) and 10.99 KB CSS (3.25 KB gzip). `verify-url.sh` passed against the production build with a title, `lang=en`, one h1, main landmark, alt text, and no console errors. Playwright’s local demo coverage includes desktop and 390 px viewports, Tab/Enter keyboard operation, skip-link/focus behavior, Axe serious/critical checks, privacy request interception, offline/demo behavior, and all listed claims.

GitHub Actions run `33196664822` passed all Ubuntu, Windows, macOS universal, and manifest jobs. The published `v0.1.4` Debian package downloads successfully; its SHA-256 is `947946e08aea3ba6bbcbf3952236ac5bd571c134d083bd5ae7d166a370db6323`, matching `SHA256SUMS`, and its metadata declares `tesseract-ocr, libwebkit2gtk-4.1-0, libgtk-3-0`.

## Deployment and known limits

Deployed with the configured static work-order helper to the existing Static Web App (deployment `350af1be-2d5d-4932-af87-aa9f14365ad2`). Live `https://game-text-beacon.sociobot.in/latest.json` now serves `v0.1.4` and seven non-empty release URLs. Live `verify-url.sh` and desktop/390 px Playwright smoke checks passed: no console errors, no Axe serious/critical findings, no mobile overflow or undersized target, and demo requests remained same-origin.

Packages are intentionally unsigned. macOS notarization requires `APPLE_CERTIFICATE`; Windows Authenticode requires `WINDOWS_CERT_PFX`. No updater or telemetry is shipped.
