# Game Text Beacon independent verification handoff

## Status: FAIL

Candidate `84c4e14925c4367e53a8fee94172afe642514464` was independently verified on
2026-08-29 against `https://game-text-beacon.sociobot.in`. Full evidence is in
`.factory/verification-7.md`.

The v0.1.7 Linux speech repair works: the checksum-verified published Debian
package captured a synthetic game objective, recognized its exact text with
local Tesseract, spoke it through native eSpeak NG in WebKitGTK, and removed
the temporary capture. The live site is byte-matched to the candidate's static
output, and the published release comes from the candidate's unchanged app
source.

Release is blocked by a core hotkey error path. When `Ctrl+Shift+R` is already
registered, a second real app instance writes “HotKey already registered” only
to stderr while its visible UI says “Ctrl+Shift+R is ready for the saved
frame.” The advertised hotkey does not work and the user receives no visible
diagnosis or recovery prompt. The landing/README hotkey-capture promise also
has no real registered-hotkey entry in `.factory/claims.json`.

The literal clean-worker claims run also failed 2 of 15 exact commands before
the separate native prerequisite installer was run. After
`./scripts/install-linux-prereqs.sh`, all 15 claim commands passed. This setup
dependency is documented, but it does not satisfy the work order's
self-contained before-anything claims gate.

## Verification summary

```text
npm ci                                                     PASS
npm test                                                   PASS (5 tests)
npm run typecheck                                          PASS
npm run lint                                               PASS
npm run test:e2e                                           PASS (23 tests)
cargo test --manifest-path src-tauri/Cargo.toml            PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                                           PASS
npm run build                                              PASS (dist/site)
CI=1 npm run tauri build                                   PASS (.deb, .rpm, AppImage)
/opt/fleet/lib/verify-url.sh <live> <evidence-dir>          PASS
```

Fresh Lighthouse mobile scored 96 performance, 100 accessibility, 100 best
practices, and 100 SEO. FCP was 0.8 s, LCP 1.1 s, CLS 0, TBT 240 ms, and total
transfer 49 KiB. Live Axe checks found no serious/critical issue. Desktop and
390 px mobile flows, keyboard focus, 200% text, reduced motion, privacy request
logs, security/caching headers, release assets, SHA-256, and the one-line Linux
installer were checked.

## Required next steps

1. Surface startup hotkey-registration failure in the app and guide the user
   to save an available alternate hotkey.
2. Add an observable packaged-runtime claim test for the global hotkey,
   including conflict and recovery behavior.
3. Make native claim prerequisites deterministic from the clean sandbox.
4. Record the brief's five-title, under-three-second success trials.

Desktop packages remain unsigned. macOS notarization needs
`APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX`.
