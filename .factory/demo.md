# Demo sandbox

Open `/demo` or `/?demo=1` to enter the sample run. It is ready with one sample objective from a fictional exploration game.

The banner remains visible in demo mode. **Reset demo** clears `demo:game-text-beacon:visited`. **Start for real** returns to the product landing page. Demo data is never read by the desktop app and uses the `demo:game-text-beacon:` localStorage namespace.

The sample is bundled in `src/logic.ts`, so the demo has no account or setup step.

The desktop build also ships the same reading workflow: use **Choose capture frame** to make a fresh local display preview, then draw, move, or resize the region before saving it with the hotkey. The landing page documents this in a three-step desktop walkthrough.
