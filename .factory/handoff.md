# Game Text Beacon verification handoff

## Status

**FAIL** — independent verification of candidate
`4f318b35a4a0c696fd8b67401730f03530cb2a63` at
`https://game-text-beacon.sociobot.in` on 2026-08-29 UTC.

The live site matches the candidate and the published `v0.1.5` desktop
release installs correctly. All 12 declared claim commands and all repository
quality/build gates pass. Acceptance is still blocked by live interaction,
low-vision reflow, and claims-contract defects. Full evidence is in
`.factory/verification-5.md`.

## Release blockers

1. **High:** Live home → **Read sample objective** throws
   `Cannot set properties of null (setting 'textContent')` because the landing
   page has no `.status` node. The automated suite misses this visible action.
2. **High:** At 390 px with 200% text, `/` expands to 664 px and `/demo` to
   424 px. The long Debian filename and demo grid force horizontal scrolling.
3. **High:** Published no-telemetry, no-payment, and no-cloud-screenshot claims
   have no matching claim entries/tests. The native OCR claim uses a fake OCR
   runner rather than invoking Tesseract/no-network behavior, and the pointer
   claim test does not exercise pointer draw/move/resize as its sandbox says.
4. **Medium:** A rejected initial desktop `get_settings` call is unhandled and
   leaves the app stuck on “Loading saved settings.”
5. **Low:** README says there are two native claim commands; there are three.

## Verification summary

```text
npm ci                                      PASS (0 vulnerabilities)
12 exact .factory/claims.json commands      PASS
npm test                                    PASS (5 tests)
npm run typecheck                           PASS
npm run lint                                PASS
npm run test:e2e                            PASS (16 tests)
cargo test --manifest-path src-tauri/Cargo.toml
                                              PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                              PASS
npm run build                               PASS (dist/site)
CI=1 npm run tauri build                    PASS (deb/rpm/AppImage)
verify-url.sh local and live                PASS
```

The live demo is one click from the first screen, isolated under
`demo:game-text-beacon:`, and makes only same-origin requests. Desktop/mobile
Axe scans found no serious/critical findings at normal text size. Keyboard,
focus, touch targets, reduced motion, headers, caching, and normal-size mobile
layout pass.

Lighthouse mobile: 93 performance, 100 accessibility, 100 best practices,
100 SEO; LCP 1.1 s, CLS 0, TBT 330 ms. Initial JS is 7.75 KB gzip, CSS is
3.33 KB gzip, and the hero is 36.44 KB.

The downloaded `v0.1.5` Debian package matched published SHA-256
`1a4cb2e658e4a139021b667a90aafa858d721d9a714b59c07b54df1ed263308d`,
declared Tesseract, and installed successfully through `public/install.sh`.
Live and local hashes match for the shell, JS, CSS, manifest, installers,
image, and 404 assets.

## Reproduce the blockers

1. Open the live root, listen for `pageerror`, and click **Read sample
   objective**.
2. At 390 px, set the default/root text size to 200%; compare
   `document.documentElement.scrollWidth` with `window.innerWidth` on `/` and
   `/demo`.
3. Compare README and privacy/landing copy with `.factory/claims.json`, then
   inspect `claim_desktop_local_ocr...` and `@claim:capture-frame`.
4. On `/?app`, reject the mocked bridge's first `get_settings` invocation; the
   rejection is unhandled and the loading status remains.

## Applicability and operator notes

This local-first desktop app has no server API, sign-in, payment endpoint,
service worker, updater, library, or CLI. Rate-limit/429, Entra, backend,
offline-PWA, updater, and consumer-package checks do not apply. Published
desktop packages remain intentionally unsigned; macOS notarization needs
`APPLE_CERTIFICATE`, and Windows Authenticode needs `WINDOWS_CERT_PFX`.
