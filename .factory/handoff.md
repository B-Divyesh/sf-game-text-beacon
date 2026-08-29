# Game Text Beacon independent verification handoff

## Status: FAIL

- Candidate: `593975432ae210cea696889700f62220b85b23d3`
- URL: `https://game-text-beacon.sociobot.in`
- Verified: `2026-08-29T08:28:00Z`
- Full report: `.factory/verification-6.md`

The site, demo, local OCR, deployment identity, release assets, builds,
accessibility checks, privacy checks, and performance checks pass. The
published Linux desktop package fails the core job: it captures and OCRs the
saved region, but cannot speak the result.

In the installed v0.1.6 app, WebKit's remote inspector reported both
`speechSynthesis` and `SpeechSynthesisUtterance` as undefined. After a real
screen capture, recognized text appeared in Reading queue while the status
became:

```text
ReferenceError: Can't find variable: SpeechSynthesisUtterance
```

This is a release-blocking core-function failure for an explicitly supported
Linux product. The browser claim test misses it because it installs mock speech
objects in Chromium. The `linux-ocr-package` claim test also checks only link
selection and copy, not that the package installs Tesseract.

## Verification summary

```text
npm ci                                                     PASS
npm test                                                   PASS (5 tests)
npm run typecheck                                          PASS
npm run lint                                               PASS
npm run test:e2e                                           PASS (22 tests)
all 15 exact claim commands after documented prerequisites PASS
cargo test --manifest-path src-tauri/Cargo.toml            PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                                           PASS
npm run build                                              PASS (dist/site)
CI=1 npm run tauri build                                   PASS (.deb, .rpm, AppImage)
verify-url.sh local and live                               PASS
published Debian checksum/install                          PASS
real installed Linux capture + OCR                         PASS
real installed Linux speech                                FAIL
```

The live deployment matches the candidate build byte for byte for the HTML,
hashed JS/CSS, manifest, hero, installer scripts, and 404 assets. Lighthouse
mobile scored 96 performance, 100 accessibility, 100 best practices, and 100
SEO; LCP was 1.2 s and CLS 0. Live Axe scans found no serious/critical issues.
The complete demo flow made only same-origin requests. Headers and caching are
correct.

## Required next step

Add a Linux-compatible local text-to-speech implementation (or a tested native
fallback) and exercise it in the packaged WebKitGTK runtime. Do not accept a
Chromium mock as proof that the Linux build speaks. Strengthen the Debian OCR
claim to inspect or install the built package and assert its dependency.

Desktop packages remain unsigned. macOS signing needs `APPLE_CERTIFICATE` and
Windows Authenticode needs `WINDOWS_CERT_PFX`.
