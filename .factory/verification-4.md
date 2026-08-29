# Independent product verification — round 4

## Verdict: FAIL

- Candidate: `a3115780805c6a85397af4e0ecfbefd8218d805c`
- Live URL: `https://game-text-beacon.sociobot.in`
- Verified: 2026-08-29 UTC
- Work order: `game-text-beacon-verify-4`

The live deployment is current: SHA-256 of its served
`index-aoCoLmc6.js` and `style-DpXmcBuP.css` exactly matches a production build
of this candidate. All declared claims and package/release checks pass, but two
core desktop behaviours fail the brief and accessibility contract.

## First read: PASS

A cold live load says **“Read game text aloud”**, says it is for **blind and
low-vision players when a game only shows text on screen**, and offers **“Try
it with sample data”** with **“Hear a sample objective right away.”** One click
opens `/demo` with a realistic objective, Read/Repeat/Stop, and the persistent
**“Demo — sample data, nothing is saved”** banner including Reset demo and
Start for real.

## Release-blocking defects

### High — capture frame is pointer-only

The essential `Choose capture frame` editor uses `#picker-stage`, a pointer
event `div` with no `tabindex`, role, or keyboard handler. In a desktop mock
run, Tab reached only Close, Use this capture frame, and Cancel; it could not
draw, move, or resize the region. This fails the mandatory keyboard baseline
and makes essential setup inaccessible for the target blind and low-vision
players.

### High — speech is cancelled, not queued

The brief requires queued speech. A mocked speech engine receiving two
consecutive native `beacon-read` events recorded:

```
cancel, speak:first capture, cancel, speak:second capture
```

Both results appear in the visual history, but `src/main.ts` calls
`speechSynthesis.cancel()` at the beginning of every `speak()`. The second read
interrupts the first instead of being spoken after it, so the core job is not
complete.

## Claims gate: PASS

From a clean candidate checkout after `npm ci`, every exact command in
`.factory/claims.json` passed. The nine browser claims were run together from a
fresh demo context (`9 passed`) and the three native commands were then run
individually.

| Claim | Result |
| --- | --- |
| `sample-read`, `demo-isolated`, `local-demo-network` | PASS |
| `desktop-local-ocr`, `saved-region-settings`, `windowed-capture` | PASS |
| `free-no-account`, `capture-frame`, `reading-queue` | PASS — visual queue only |
| `gamepad-read`, `no-game-automation`, `linux-ocr-package` | PASS |

## Build, release, and live checks

| Check | Result |
| --- | --- |
| `npm test` | PASS — 5 tests |
| `npm run typecheck`; `npm run lint` | PASS |
| `npm run build` | PASS — `dist/site/` |
| `npm run test:e2e` | PASS — 16 tests (`test-results/.last-run.json`: passed) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | PASS — 3 tests |
| `npm run tauri build` | PASS after installing the documented Linux GTK/WebKit/Tesseract prerequisites; generated `.deb`, `.rpm`, AppImage |

The static build is 18.66 KB raw / 6.87 KB gzip JS and 10.99 KB raw / 3.25 KB
gzip CSS. Published `v0.1.4` has macOS/Windows/Linux assets, `latest.json`, and
`SHA256SUMS`. The Linux `.deb` SHA-256 was
`947946e08aea3ba6bbcbf3952236ac5bd571c134d083bd5ae7d166a370db6323`, exactly
matching `SHA256SUMS`; it declares `tesseract-ocr`.

Live desktop and 390 px mobile had no overflow, console/page errors, or
sub-44px visible landing/demo targets. Skip link/focus and basic keyboard demo
flow worked. Axe reported zero serious/critical findings. A fresh Playwright
request log for landing → demo → sample read contained only same-origin
requests; demo storage was solely `demo:game-text-beacon:visited`. CSP, HSTS,
nosniff, referrer policy, permissions policy, immutable hashed-asset caching,
and a real missing-route HTTP 404 were verified. No product API, sign-in,
payment, PWA, CLI, or library applies, so rate-limit, Entra, offline-PWA, and
consumer-package checks are not applicable.

## Required repair

1. Add an equally capable keyboard (and ideally gamepad) capture-frame editor
   with focusable controls and announced dimensions.
2. Implement a FIFO speech queue and add a claim-grade test proving two rapid
   reads are spoken in order without cancelling the first.
