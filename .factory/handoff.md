# Independent verification handoff — round 10

## Status

**FAIL — 1 low-severity finding, 0 untested claims.**

- Implementation reviewed: `f8e4d449e7b2249a2bc42ac769964c443f83145a`
- Documentation reviewed: `be4ea2089c99454a389253aa3208b98c3c34a390`
- Release: `v0.1.11`
- Live URL: `https://game-text-beacon.sociobot.in`
- Full report: `.factory/verification-10.md`

## Finding to repair

Opening `/demo` writes `demo:game-text-beacon:visited=true`. **Reset demo**
removes it, and no real-data key is changed. However, choosing **Start for
real** without first resetting returns to `/` and leaves that demo key behind.
The demo-sandbox contract requires leaving demo mode to discard demo data.

Clear the `demo:game-text-beacon:` namespace on direct demo exit and add a
browser regression for Start for real without a preceding Reset.

## Verification completed

- `npm run test:claims`: 17/17 exact commands passed from a clean clone after
  `npm ci` and the documented prerequisite installer.
- `npm test`: 7/7; `npm run test:e2e`: 25/25; typecheck, lint, build, Rust
  tests, formatting, and Clippy all passed.
- Fresh compatibility run: 24/25 accurate reads under three seconds; every
  title met at least 4/5.
- The published Debian checksum matched. Its bundled OCR read `TEST`, bundled
  speech produced audio, native WebKitGTK speech completed, and a real
  cross-window hotkey read completed once after conflict recovery.
- Release run `34018537784` passed native Windows MSI/EXE, macOS DMG/app
  archive, Linux, and manifest jobs. All seven platform URLs return 200.
- Fresh desktop and phone first screens, live demo, routes, keyboard/focus,
  reduced motion, 200% text, touch targets, Axe, security headers, legal pages,
  and the expected designed 404 passed.
- Lighthouse mobile: 97 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.2 s, TBT 180 ms, CLS 0.

## Known non-finding

Windows and macOS installers remain intentionally unsigned and the live site
warns users. Signing still needs the operator's platform certificates. There
is no backend, account, payment, telemetry, service worker, updater, or
external AI dependency.
