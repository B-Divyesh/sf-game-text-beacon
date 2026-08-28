# Independent product verification — round 3

## Verdict: FAIL

- Candidate commit: `e4984e381608f6b31ae0e830f1e867101ad030cc`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: 2026-08-28 UTC
- Work order: `game-text-beacon-verify-3`

The prior stale-deployment concern is resolved: the live static files match this
candidate byte-for-byte and the release metadata is now populated. This candidate
still fails its product contract for two independent reasons: a live 404 load
emits a CSP console error, and a visitor-reliant controller capability has no
entry or observable test in `.factory/claims.json`.

## First read: PASS

A cold, new-context load answers all three required questions in plain words:

- **What:** “Read game text aloud.”
- **For whom:** “For blind and low-vision players when a game only shows text on screen.”
- **First action:** “Try it with sample data,” with “Hear a sample objective right away.”

The primary action reaches `/demo` in one click. It has a realistic objective,
visible demo banner, Reset demo, Start for real, repeat, and stop controls.

## Mandatory claim gate: PASS

`npm ci` was run from the clean candidate checkout before executing every exact
command in `.factory/claims.json`. Each selector passed.

| Claim | Exact command | Result |
| --- | --- | --- |
| `sample-read` | `npm run test:e2e -- --grep @claim:sample-read` | PASS (1 Playwright test) |
| `demo-isolated` | `npm run test:e2e -- --grep @claim:demo-isolated` | PASS (1 Playwright test) |
| `local-demo-network` | `npm run test:e2e -- --grep @claim:local-demo-network` | PASS (1 Playwright test) |
| `desktop-local-ocr` | `cargo test --manifest-path src-tauri/Cargo.toml claim_desktop_local_ocr` | PASS (1 Rust test) |
| `free-no-account` | `npm run test:e2e -- --grep @claim:free-no-account` | PASS (1 Playwright test) |
| `saved-region-settings` | `cargo test --manifest-path src-tauri/Cargo.toml claim_saved_region_settings` | PASS (1 Rust test) |
| `windowed-capture` | `cargo test --manifest-path src-tauri/Cargo.toml claim_windowed_capture` | PASS (1 Rust test) |
| `capture-frame` | `npm run test:e2e -- --grep @claim:capture-frame` | PASS (1 Playwright test) |
| `reading-queue` | `npm run test:e2e -- --grep @claim:reading-queue` | PASS (1 Playwright test; re-run with list reporter: 516 ms) |
| `no-game-automation` | `npm run test:e2e -- --grep @claim:no-game-automation` | PASS (1 Playwright test) |
| `linux-ocr-package` | `npm run test:e2e -- --grep @claim:linux-ocr-package` | PASS (1 Playwright test) |

## Release-blocking findings

### High — live 404 violates CSP and logs a console error

Loading `https://game-text-beacon.sociobot.in/missing-note` returns the intended
404 page, but its inline `<style>` is blocked by the deployed CSP
(`style-src 'self'`). Chromium logs: `Applying inline style violates the
following Content Security Policy directive 'style-src 'self''`. This directly
violates the required “no console errors on load” and the site-structure rule
that CSP must match actual page loads without inline-style violations. The 404
page also has no shared header/footer, contrary to the standard skeleton rule.

### High — unlisted, unproven controller-button capability

The desktop UI tells a user: “A connected controller’s first button also reads
the saved frame while Beacon is open.” (`src/main.ts`). This is a core,
visitor-reliant, gamepad-related capability from the brief, yet no claim entry
or observable sandbox test covers it. The claims contract requires every such
claim to be in `.factory/claims.json`; an unlisted claim fails review until it
is removed or given an observable demo/desktop test. Other separate promises
not directly covered by a matching claim include “does not bypass anti-cheat”
and the exclusive-fullscreen limitation.

## Evidence that passed

- `npm test` — PASS, 4 tests.
- `npm run typecheck` and `npm run lint` — PASS.
- `npm run test:e2e` — PASS, 14 tests, including desktop-bridge normal,
  boundary, and invalid-empty-hotkey paths, keyboard, 390 px layout, and Axe.
- `npm run build` — PASS; `dist/site/` produced. Initial JS is 18.84 KB raw /
  6.96 KB gzip and CSS 10.89 KB raw / 3.24 KB gzip, inside the static budgets.
- The first clean `npm run tauri build` failed only because this disposable
  worker lacked the documented GTK/WebKit development prerequisites
  (`glib-2.0 >= 2.70`). After running `./scripts/install-linux-prereqs.sh`,
  `CI=1 npm run tauri build` **PASSed** and produced the Linux AppImage
  (80,714,232 bytes), Debian package (6,551,672 bytes), and RPM (6,553,876
  bytes). This removes the environment-only build concern; it does not change
  the two release-blocking findings above.
- Live desktop and 390 px landing/demo flows have no horizontal overflow and
  all measured `a`, `button`, and `input` targets are at least 44 px. The demo
  writes only `demo:game-text-beacon:visited`, and Reset removes it.
- A fresh live demo request log contained only the same origin: page, local JS,
  CSS, `latest.json`, and the bundled image. No analytics, cloud OCR,
  third-party font/script, account, payment, AI, or external request was found.
- Live `/`, `/demo`, `/privacy`, and `/terms` have correct route titles, one
  h1, main landmark, no console/page errors, and zero Axe serious/critical
  findings at both 1440 px and 390 px. The skip link is first in keyboard order
  with a designed 4 px ochre focus ring; it focuses `main`, and route changes
  focus the new h1. Reduced motion is covered by the shipped Playwright suite.
- `/opt/fleet/lib/verify-url.sh` passed for the live home page: 200, title,
  `lang=en`, one h1, main, image alt text, and no console errors.
- Live headers include HTTPS/HSTS, `nosniff`, strict-origin referrer policy,
  restrictive CSP, and permissions policy. HTML has 30-second revalidation;
  hashed JS and the hero image are one-year immutable; `latest.json` is
  `no-store`.
- All 15 candidate static files (HTML, hashed JS/CSS, images, installers,
  manifest, 404, robots, sitemap, and icons) sha256-match the live deployment.
- `v0.1.1-r5` publishes all seven platform assets, `SHA256SUMS`, and
  `latest.json`. Downloaded Debian package SHA-256 is
  `320270152f1ff77d870370579d7e8d4d797fee848c4fac0c11d8383d561f952b`,
  matching the published checksum; it declares `tesseract-ocr`,
  `libwebkit2gtk-4.1-0`, and `libgtk-3-0`.

There is no product server endpoint, sign-in, PWA/service worker, paid flow,
or library/CLI API. Rate-limit, Entra tenant, offline-update, and consumer
package checks therefore do not apply.

## Required repairs before acceptance

1. Move the 404 CSS into a same-origin stylesheet (or otherwise make CSP and
   markup agree without weakening the policy), then verify a missing-route load
   produces no browser console error. Give the 404 page the required shared
   header/footer structure.
2. Add a `gamepad-read` claim and an observable mock-controller test that proves
   one press creates exactly one read of the saved frame, or remove the
   controller-button promise. Add matching claim coverage or remove the other
   distinct anti-cheat/fullscreen promises.
