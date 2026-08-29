# Game Text Beacon repair handoff

## Status

PASS — this repairs the two release blockers in verifier report commit
`6ad2000fac47b6d57f9a1c71030ff0bf2b76ffc8` for candidate
`a3115780805c6a85397af4e0ecfbefd8218d805c`.

The repaired desktop release is `v0.1.5` and the static site is deployed at
`https://game-text-beacon.sociobot.in`.

## Repairs

- The capture-frame picker now has a visible keyboard instruction, a focused
  capture-frame editor, announced frame dimensions, and exact labeled values.
  `D` starts a frame, `M` moves it, `R` resizes it, arrows adjust by 10 pixels,
  and Shift+arrows adjust by 50 pixels. Pointer drawing, moving, and corner
  resizing remain available.
- Sequential reads no longer call `speechSynthesis.cancel()`. Browser speech
  receives utterances in FIFO order; only the explicit Stop controls cancel.
- The claim inventory and Playwright regressions prove the keyboard frame flow
  persists `{ x: 110, y: 150, width: 210, height: 100 }`, and prove two native
  `beacon-read` events produce `speak:first`, `speak:second`, with no cancel.
  The latter then proves Stop is the only action that adds `cancel`.
- The frame-dialog regression also runs Axe against the open dialog.

## Verification

Fresh JavaScript install and complete local suite:

```sh
npm ci
npm test                         # PASS — 5 tests
npm run typecheck                # PASS
npm run lint                     # PASS
npm run build                    # PASS — dist/site
npm run test:e2e                 # PASS — 16 tests
cargo test --manifest-path src-tauri/Cargo.toml                         # PASS — 3 tests
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings # PASS
CI=1 npm run tauri build          # PASS
```

Every one of the twelve exact commands in `.factory/claims.json` passed from
the clean install. The two repaired claim commands were rerun individually:

```sh
npm run test:e2e -- --grep @claim:capture-frame
npm run test:e2e -- --grep @claim:reading-queue
```

The final local Tauri `0.1.5` package build produced:

- `Game Text Beacon_0.1.5_amd64.AppImage` — 80,718,328 bytes
- `Game Text Beacon_0.1.5_amd64.deb` — 6,553,966 bytes
- `Game Text Beacon-0.1.5-1.x86_64.rpm` — 6,555,809 bytes

The static build is 21.47 KB raw / 7.72 KB gzip JavaScript and 11.48 KB raw /
3.32 KB gzip CSS. Local `verify-url.sh` passed (title, `lang=en`, one h1,
main, alt text, and no console errors). Local Playwright confirmed the 390px
demo has no horizontal overflow or targets below 44px.

Release workflow `33236702723` passed `create-release`, Windows, Linux, macOS
universal, and manifest jobs. Public `v0.1.5` includes all platform assets,
`latest.json`, and `SHA256SUMS`. The downloaded Debian asset matched its
published SHA-256:

```text
1a4cb2e658e4a139021b667a90aafa858d721d9a714b59c07b54df1ed263308d
```

## Deployment and live evidence

Code repair commit `b62adc23313568dc02d699c3460484234e7cac9d`, Axe regression
commit `d1cfd73188fefaf3ac9d770711f64847e6acb1fe`, and release-manifest commit
`b2ac52893eb0b4cac133c5bcc0d9225660d33ce0` are pushed to `main`; tag `v0.1.5`
is pushed too.

Static Web Apps deployment `1be5bd96-fe4a-41e7-91ad-85e95bed3e0e` completed
against `dist/site`. The custom domain returned HTTPS 200. Live
`verify-url.sh` passed. The served `assets/index-BVDtVuDr.js` has SHA-256
`628d0b0b1767ae2522e6fd473a216e51028b68072ec0bc53550bc8cb9897bca8`, exactly
matching the local production build, and live `latest.json` resolves `v0.1.5`.

Live Playwright checked `/`, `/demo`, `/privacy`, `/terms`, and the real 404:
each has one h1/main and zero serious/critical Axe findings. There were no
page/script errors; Chromium's expected failed-resource message for the 404
document was excluded. The demo made only same-origin requests, stored only
`demo:game-text-beacon:visited`, keyboard focus reached the skip link and
then the new route h1, and the 390px demo had no overflow, no undersized
targets, and no errors. Headers include CSP, HSTS, `nosniff`, strict referrer
policy, and the disabled camera/microphone/geolocation/payment policy.

This local-first desktop app has no server API, account, payment flow,
identity-provider integration, service worker, updater, telemetry, or consumer
package. Rate-limit, response-policy API, identity, offline-PWA, updater, and
consumer-package checks are therefore not applicable; the live privacy and
static response-policy checks above were run instead.

## Known limits / operator action

Desktop packages are intentionally unsigned. macOS notarization needs
`APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX`. No updater
is shipped, so no updater manifest is required.
