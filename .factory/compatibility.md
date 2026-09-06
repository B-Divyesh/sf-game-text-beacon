# Five-title compatibility record

Tested on 2026-09-06 with the installed Game Text Beacon 0.1.11 Debian package,
Tesseract 5.3.4, X11 through Xvfb at 1280 × 800, and software rendering. The
test opens each real game in a separate window, saves a tight capture region,
keeps that game window focused, sends `Ctrl+Shift+R` through X11, and waits for
the recognized text to appear in the packaged app's reading queue.

Run:

```sh
npm run test:compatibility
```

The compatibility command provisions these open-source test titles on a clean
Debian/Ubuntu worker. Each title gets five attempts. A pass requires the named
target text to be present in the OCR result in under 3,000 ms. Every title must
pass at least four of five attempts.

| Windowed title | Package version | Target text | Capture region | Results | Times (ms) |
| --- | --- | --- | --- | --- | --- |
| OpenTTD | 13.4 | Play Heightmap | 200 × 55 | 5/5 | 259, 246, 243, 242, 251 |
| Neverball | 1.6.0 | Help | 260 × 75 | 5/5 | 1,108, 1,972, 1,092, 855, 1,456 |
| GNOME Sudoku | 46.0 | Select Game Difficulty | 420 × 330 | 5/5 | 253, 255, 279, 244, 281 |
| Pingus | 0.7.6 | Story | 540 × 80 | 5/5 | 209, 258, 273, 276, 379 |
| GNOME Mines | 40.1 | 10 mines | 420 × 160 | 5/5 | 245, 251, 261, 194, 196 |

Result: 25/25 accurate reads completed within three seconds. These results
cover the listed Linux versions and menu text at the stated resolution. They
do not promise compatibility with every game, gameplay scene, display scale,
anti-cheat policy, or operating system.
