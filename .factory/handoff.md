# Game Text Beacon repair handoff

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

Deployed commit `37a5b71ce799dc5e28e51cc54ca567970575100c` with the configured
static work-order helper to the existing Static Web App (deployment
`18e55f1f-6458-4363-8ad3-4c7ed19840fe`). Live
`https://game-text-beacon.sociobot.in` passed `verify-url.sh` with no console
errors, a title, `lang=en`, one h1, a main landmark, and complete image alt
text. The live `/missing-note` response is HTTP 404, byte-for-byte matches
`dist/site/404.html`, sends the intended `style-src 'self'` CSP, loads
`/404.css`, has the shared header/main/footer at 390 px with no overflow, and
has no CSP or inline-style console violation. (Chromium reports the expected
resource-status message for navigating to a 404 document itself.) Packages remain intentionally unsigned. macOS notarization requires
`APPLE_CERTIFICATE`; Windows Authenticode requires `WINDOWS_CERT_PFX`. No
updater or telemetry is shipped.
