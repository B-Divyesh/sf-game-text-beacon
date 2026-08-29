# Game Text Beacon repair handoff

## Status

Release-blocking findings from verifier report commit
`725e11453b6c82aefa06c3e8678dfdf426877c78` against candidate
`84c4e14925c4367e53a8fee94172afe642514464` are repaired in source commit
`72ad05efecf0870c33e3488aa9255c2492c94c75`. Version 0.1.8 is the repaired
desktop and landing-site release.

## Repairs

- The native core now records whether the configured global hotkey actually
  registered. The desktop UI reads that native state and never reports a
  hotkey as ready without confirmation.
- A startup conflict is announced in the visible live status, marks the input
  invalid, keeps **Read this frame** available, and offers a tested alternate
  hotkey. A rejected edit restores the last working shortcut when possible.
- `@claim:packaged-global-hotkey` starts two installed Debian-package
  instances, proves the second instance exposes the conflict, recovers through
  **Try Ctrl+Alt+R**, focuses a separate window, sends the OS-level shortcut,
  and observes exactly one OCR result containing the target text.
- Every native claim provisions its Linux build/runtime requirements through
  the idempotent `scripts/install-linux-prereqs.sh`. `npm run test:claims`
  executes all 16 exact commands from `.factory/claims.json` from the repository.
- `npm run test:compatibility` provisions and opens five real windowed games,
  exercises the installed app with a registered global hotkey, and requires at
  least 4/5 correct OCR reads per title in under 3,000 ms. Exact method and
  results are in `.factory/compatibility.md`.
- The inaccurate landing caption that assumed the default shortcut was always
  available now says that Beacon checks it. The copy audit was updated.

## Verification evidence

Run from `/work/repo` on 2026-08-29:

```text
npm ci                                                       PASS (100 packages, 0 vulnerabilities)
npm test                                                     PASS (5 tests)
npm run typecheck                                            PASS
npm run lint                                                 PASS
npm run test:e2e                                             PASS (24 tests)
npm run test:claims                                          PASS (16/16 exact claim commands)
cargo test --manifest-path src-tauri/Cargo.toml              PASS (3 tests)
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --features desktop -- -D warnings
                                                             PASS
npm run test:linux-hotkey-package                            PASS (real installed app, X11 shortcut, conflict and recovery)
npm run test:compatibility                                   PASS (25/25 correct and under 3,000 ms)
npm run build                                                PASS (static site in dist/site)
CI=1 npm run tauri build                                     PASS (.deb, .rpm, .AppImage)
/opt/fleet/lib/verify-url.sh http://127.0.0.1:4174 ...       PASS
QA_BASE_URL=http://127.0.0.1:4174 node .factory/qa-live.mjs  PASS
```

The compatibility timings were: OpenTTD 185–204 ms, Neverball 658–1,968 ms,
GNOME Sudoku 242–265 ms, Pingus 244–256 ms, and GNOME Mines 245–254 ms.

Local Chromium covered desktop and 390 × 844 mobile layouts, keyboard-only
entry and route focus, the skip link, focus visibility, reduced motion, the
demo reset/exit storage boundary, desktop ready/conflict states, and route
metadata. All tested routes had one `h1`, one `main`, no browser console or
page errors, and no serious or critical Axe findings. The demo request log was
same-origin only.

Lighthouse 12.8.2 mobile against the live deployment scored 100 performance,
100 accessibility, 100 best practices, and 100 SEO. FCP was 0.8 s, LCP 1.1 s,
CLS 0, TBT 60 ms, and transfer was 49 KiB. Initial JavaScript is about 9.3 KiB
gzip, CSS 3.4 KiB gzip, and the hero WebP is 36,440 bytes.

## Release and deployment

Tag `v0.1.8` points at repair source commit `72ad05e`. GitHub Actions run
[`33251225040`](https://github.com/B-Divyesh/sf-game-text-beacon/actions/runs/33251225040)
completed successfully for Linux, Windows, universal macOS, and the final
manifest job. Release `v0.1.8` contains AppImage, Debian, RPM, DMG, EXE, MSI,
and macOS app archive assets plus `SHA256SUMS` and `latest.json`.

The downloaded Debian asset matched its published SHA-256 exactly:
`fa2b4f0486f362b078e57d1d5fd513e1629ff3b3e02c71b4b2ad7023fbe734ea`.
The production `install.sh` downloaded, verified, and installed that package;
`dpkg-query` reported `game-text-beacon 0.1.8 install ok installed`.

Static deployment `c81d1bbc-64b2-4368-baf3-942daca9fa13` completed on the
existing Azure Static Web App and custom domain
`https://game-text-beacon.sociobot.in`. Live verification evidence is at
`/tmp/game-text-beacon-live.AQ8NVe` in this worker. The live `index.html` and
`latest.json` byte-match `dist/site` with SHA-256 values
`7fa7d45592d666fba475a81f19e0abfbf43b67738dfa49cfc5b7292b6ab1df79` and
`24e3f1b135fefb567535325d6a44c083cb78353b610e605ad5039206a0a9ed20`.
The detected Linux download links to the real v0.1.8 Debian asset.

Live `/`, `/demo`, `/privacy`, `/terms`, `latest.json`, and the hashed JS asset
returned 200; an unknown route returned the designed HTML page with status
404. Documented routes had no console/page errors or serious/critical Axe
findings. Live desktop and 390 px mobile checks, keyboard navigation, demo
isolation, reduced motion, and same-origin request recording all passed.

## Privacy, offline, update, and response policy

The demo and desktop processing make no third-party requests. Capture images,
OCR, speech, settings, and demo data remain local; temporary OCR captures are
removed. There is no account, payment, analytics, telemetry, service worker,
or in-app updater. Offline/update migration tests are therefore not applicable,
and the product makes no offline claim. If release metadata is unavailable,
the site keeps a calm publishing state instead of throwing a console error.

The production configuration provides immutable caching for hashed/static art,
`no-store` for `latest.json`, SPA rewrites for documented routes, a true 404
response, CSP, nosniff, referrer, and permissions headers.

## Known limits and operator action

- The five-title record covers the listed Linux versions, text, scale, and
  resolution. It does not promise every game, scene, display scale, anti-cheat
  policy, or operating system.
- Desktop packages are unsigned. macOS notarization needs
  `APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX` and their
  related signing secrets before a signed release can be produced.
