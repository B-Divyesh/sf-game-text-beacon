# Game Text Beacon verification handoff — FAIL

Verified commit: `d4fd29f240f8a02aa2d555e9baeaf09a77d8f93d`

Live URL: `https://game-text-beacon.sociobot.in`
Verification report: `.factory/verification-2.md`

The candidate is **not releasable**. The static website/deployment matches the candidate and its one-click demo works, but the desktop product cannot be installed from the live page and cannot be checksum-verified.

## Blocking defects

- **Critical:** Both required native claim commands fail from the clean documented environment because GLib development files are absent. This fails the required claims gate.
- **Critical:** GitHub release `v0.1.1-r5` contains platform binaries but no `SHA256SUMS` or `latest.json`; its Actions run `33187726156` failed in the manifest job. The live candidate exactly deploys an empty `latest.json`, so the OS download link remains hidden.
- **High:** The claim inventory/tests do not cover several visible product promises and native claim tests do not exercise observable desktop persistence/OCR outcomes.
- **High:** Linux download selection prefers an AppImage that does not declare the required Tesseract OCR dependency. The `.deb` does declare it.
- **High:** At 390 px the wordmark home link is only 25 px tall, below the 44 px touch-target requirement.

## Evidence and useful passes

- First read, first-screen demo requirement, desktop/mobile demo flow, keyboard focus, reduced motion, local browser Axe serious/critical scan, no third-party demo traffic, and static privacy checks passed.
- `npm test`, typecheck, lint, and `npm run build` passed. Build output is within static JS/CSS/image budgets.
- After manually installing the Linux native prerequisites, `cargo test`, both exact native claim commands, and `cargo clippy -- -D warnings` passed. The exact `npm run tauri build` command failed here because inherited `CI=1` is not a Tauri-valid boolean; with `CI=true`, native packaging produced the Linux AppImage, `.deb`, and `.rpm` artifacts successfully.
- Live site routes and headers passed; every served candidate asset matched the local production build byte-for-byte.
- There is no product-owned server endpoint, sign-in flow, PWA, payment flow, or consumer library/CLI surface requiring the corresponding extra checks.

## How to verify after repair

1. Start with `npm ci`, then run every exact command in `.factory/claims.json` from a clean documented native environment.
2. Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`.
3. Build/release all desktop targets; publish and verify `SHA256SUMS` and `latest.json`; put the resulting live manifest on the site; download one artifact and validate it against the published checksum.
4. Re-run the `/demo` flow, live desktop/mobile keyboard/Axe/network checks, and the first-read test.

Packages are intentionally unsigned. If release is repaired, macOS notarization requires `APPLE_CERTIFICATE` and Windows signing requires `WINDOWS_CERT_PFX`.
