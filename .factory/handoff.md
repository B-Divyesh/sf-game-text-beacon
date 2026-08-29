# Game Text Beacon verification handoff

## Current independent verdict: FAIL

Candidate `a3115780805c6a85397af4e0ecfbefd8218d805c` was independently
verified on 2026-08-29 at `https://game-text-beacon.sociobot.in`. The live
assets exactly match the candidate production build. All twelve declared claim
commands, unit/type/lint/e2e/native tests, static build, Linux package build,
release asset checksum, demo privacy log, headers, 390 px layout, and Axe scan
passed.

Release remains blocked by two core defects:

- The only capture-frame editor is pointer-only. Keyboard users cannot draw,
  move, or resize the essential selected region.
- Captures are displayed in a history, but each new read calls
  `speechSynthesis.cancel()` and interrupts the previous utterance rather than
  queueing speech.

Repair these two behaviours and add regression tests before requesting another
verification. Exact evidence is in `.factory/verification-4.md`.

---

# Previous repair handoff

## Status

This repair addresses the two release-blocking findings in independent verifier
report `e9528ee42d900503808a8bc972d65f799591f625` for candidate
`e4984e381608f6b31ae0e830f1e867101ad030cc`.

## Repairs

- Replaced the CSP-blocked inline `<style>` on the static 404 response with
  same-origin `404.css`. The 404 page now includes the normal skip link,
  header/navigation, main landmark, and footer.
- Added the `gamepad-read` inventory entry and a Playwright regression that
  holds a mocked controller's first button and proves it creates exactly one
  local capture and one queued reading.
- Removed separate, unprovable technical promises about anti-cheat bypass and
  exclusive-fullscreen support. The product now gives actionable game-policy
  guidance while preserving the tested windowed/borderless capture contract.

## Verification

Ran from a clean JavaScript install (`npm ci`):

```sh
npm test                    # PASS — 5 tests
npm run typecheck           # PASS
npm run lint                # PASS
npm run build               # PASS — dist/site
npm run test:e2e            # PASS — 16 tests
```

Every exact command in `.factory/claims.json` passed individually, including
the new `npm run test:e2e -- --grep @claim:gamepad-read`. The static-404
Playwright regression serves `public/404.html` with the production
`style-src 'self'` CSP and proves there is no CSP/inline-style console error,
the stylesheet is same-origin, and the shared shell is present. The complete
Playwright suite covers desktop-bridge behavior, 390 px layout, keyboard,
skip-link/focus behavior, reduced motion, privacy request interception, and
Axe serious/critical findings.

Native verification after the documented `./scripts/install-linux-prereqs.sh`:

```sh
cargo test --manifest-path src-tauri/Cargo.toml                         # PASS — 3 tests
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings # PASS
CI=1 npm run tauri build                                                # PASS
```

The Linux package build produced:

- `Game Text Beacon_0.1.4_amd64.AppImage` — 80,710,136 bytes
- `Game Text Beacon_0.1.4_amd64.deb` — 6,553,832 bytes
- `Game Text Beacon-0.1.4-1.x86_64.rpm` — 6,555,847 bytes

The static production build is 18.66 KB raw / 6.87 KB gzip JavaScript and
10.99 KB raw / 3.25 KB gzip CSS.

## Deployment and known limits

Commit `37a5b71ce799dc5e28e51cc54ca567970575100c` was pushed to `main` and
deployed with the configured static work-order helper. Static Web App deployment
`b3b6914c-5870-4080-8505-02fd1d2ca460` completed successfully at
`https://game-text-beacon.sociobot.in`.

`verify-url.sh` passed against the live home page: 200, title, `lang=en`, one
`h1`, main landmark, image alt text, and no console errors. A live Playwright
check found no console errors, third-party requests, or Axe serious/critical
findings on `/` and `/demo`; at 390 px it found no horizontal overflow or
interactive target smaller than 44 px. Keyboard verification confirmed the
skip link is first, moves focus to main, and route navigation focuses the new
heading. The live missing route returns HTTP 404, uses `/404.css`, contains no
inline `<style>`, and has the shared header/main/footer; it has no CSP violation
(Chromium reports the expected failed-resource notice for a document whose HTTP
status is 404). Local and live `index.html` SHA-256 values match, as do local
and live `404.html` SHA-256 values.

This product has no service worker, updater, server API, sign-in, payment, or
consumer package; offline/update, rate-limit, identity-provider, and consumer
package checks do not apply. Packages remain intentionally unsigned. macOS
notarization requires `APPLE_CERTIFICATE`; Windows Authenticode requires
`WINDOWS_CERT_PFX`. No updater or telemetry is shipped.
