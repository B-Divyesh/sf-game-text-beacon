# Game Text Beacon repair handoff

## Status

Repair commit `f1c471e` addresses verifier report `fb2aa46a5a9b1bfa01e6268ce05818c7ab0a17c8` and is pushed to `main`. The static deployment is triggered by that push.

## Repairs

- Published the missing `SHA256SUMS` and `latest.json` assets for release `v0.1.1-r5`. The checked-in static manifest now points at the seven real release assets, so the OS-specific download control is available.
- Made the GitHub Actions manifest job idempotent: it uses an isolated temporary directory, hashes only desktop artifacts, writes the release manifest, and uploads both metadata assets. Desktop builds explicitly enable the `desktop` feature.
- Split the native local-capture contract from Tauri/GTK compilation. Exact native claim commands now run from a clean Rust checkout without GLib/WebKit headers, while desktop launch/package builds use the documented `desktop` feature and Debian/Ubuntu prerequisite script.
- Replaced source/default-only Rust checks with observable local OCR cleanup, exact persisted settings, and bounded-region tests. Added desktop-bridge browser regressions for choosing/saving a frame, reading into the queue, and no game-control native command. All visible visitor-reliant claims are listed in `.factory/claims.json`.
- Linux landing/download and `install.sh` now select the Debian package, which declares and installs `tesseract-ocr`; AppImage is no longer selected for the core OCR path.
- Increased the mobile wordmark home control to a 44 px minimum hit area. The 390 px regression includes it.
- Added a Tauri npm wrapper that passes `--features desktop` and normalizes inherited `CI=1` to Tauri's accepted `CI=true`.

## Verification

Run from a fresh checkout:

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
./scripts/install-linux-prereqs.sh  # Debian/Ubuntu native launch/package only
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
npm run build
CI=1 npm run tauri build
```

Exact claim commands are recorded in `.factory/claims.json`; each was exercised by the unit and Playwright suite. `npm run test:e2e` covers desktop and 390 px mobile, keyboard/skip-link behavior, focus restoration, local-demo network privacy, the published manifest, Axe serious/critical findings, and all browser claims.

Local production-site evidence: `npm run build` produced `dist/site/`; `verify-url.sh` passed at `http://127.0.0.1:4174` with title, `lang=en`, one h1, main, alt-text, and no console errors. The production bundle is 18.84 KB raw JS (6.96 KB gzip) and 10.89 KB CSS (3.24 KB gzip). `CI=1 npm run tauri build` passed and produced the Linux AppImage, `.deb`, and `.rpm`; the local `.deb` declares `tesseract-ocr, libwebkit2gtk-4.1-0, libgtk-3-0`.

Release evidence: `v0.1.1-r5` now exposes seven platform assets plus `SHA256SUMS` and `latest.json`. The `.deb` SHA-256 is `320270152f1ff77d870370579d7e8d4d797fee848c4fac0c11d8383d561f952b`, matching the published checksum.

## Deployment and known limits

The static deployment is triggered by the pushed `main` branch. At the final worker check, the live host still returned its prior `latest.json` (`unpublished`, zero assets) even though `57da602` is present on `origin/main`; the factory static deploy has been triggered but had not yet consumed the branch. Packages are intentionally unsigned; macOS notarization needs `APPLE_CERTIFICATE` and Windows Authenticode needs `WINDOWS_CERT_PFX`. No updater or telemetry is shipped.
