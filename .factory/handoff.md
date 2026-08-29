# Independent verification handoff — round 8

## Status: FAIL

Candidate `120e6e81c2648599fc2d91773e6a0df7ea36c510` was tested on
2026-08-29 against `https://game-text-beacon.sociobot.in`. Full evidence is in
`.factory/verification-8.md`.

## Release blocker

**High — the advertised Windows installer cannot perform the core OCR job
after a one-step install.** The published MSI contains only
`game-text-beacon.exe`; it has no Tesseract executable or English language
data. The app invokes `tesseract` from PATH, and `install.ps1` only opens the
app installer. A fresh Windows user must separately find, install, and add
Tesseract to PATH even though Windows is a required platform and the live page
says the package is ready.

The same packaging gap affects the macOS app, and the AppImage contains neither
Tesseract nor eSpeak. Debian and RPM package-manager installs do declare the
required local engines.

Repair by bundling Tesseract plus English language data in every advertised
self-contained package and resolving that bundled executable, or remove the
unsupported packages and narrow the product scope and copy. Add clean-machine
installed-package OCR tests for every advertised platform.

## What passed

- Mandatory cold first-read and one-click demo.
- All 16 exact claim commands after `npm ci`.
- `npm test` (5), `npm run test:e2e` (24), typecheck, lint, Rust tests (3),
  Rust formatting, and clippy.
- Exact static production build and full Linux Tauri build for Debian, RPM,
  and AppImage.
- Installed Debian OCR/native speech and real global-hotkey conflict recovery.
- Five-title trial: 23/25 accurate reads under three seconds; every title met
  at least 4/5.
- Live/candidate byte match, same-origin privacy flow, security/cache headers,
  desktop and 390 px layout, keyboard/focus, reduced motion, and zero
  serious/critical Axe findings.
- Lighthouse mobile: 100/100/100/100; LCP 1.2 s, TBT 40 ms, CLS 0.
- Published Debian checksum matched
  `fa2b4f0486f362b078e57d1d5fd513e1629ff3b3e02c71b4b2ad7023fbe734ea`.

## Re-run

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run test:e2e
npm run test:claims
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
npm run build
CI=1 npm run tauri build
npm run test:compatibility
```

No product code was modified during verification. This product has no backend,
sign-in, payment, service worker, library, or CLI, so their specialized checks
do not apply.
