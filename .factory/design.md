# Game Text Beacon — visual thesis

## Direction

**Handwritten lab notebook.** The interface feels like the practical field notes a player keeps beside a keyboard: warm paper, dark graphite, blue pencil marks, and a clearly bounded capture frame. This fits an assistive utility because it makes each action feel intentional and calm, rather than like a hidden game overlay or a sci-fi dashboard.

## Tokens

| Role | Token | Value |
| --- | --- | --- |
| Paper | `--paper` | `#f6f0df` |
| Paper shade | `--paper-deep` | `#e7dcc1` |
| Ink | `--ink` | `#1d2a32` |
| Muted graphite | `--muted` | `#53636b` |
| Beacon blue | `--blue` | `#005f73` |
| Pencil ochre | `--ochre` | `#a95d16` |
| Safe green | `--green` | `#1e6245` |
| Warning red | `--red` | `#9d3035` |

The site uses an explicit light paper treatment and a charcoal reverse treatment for the app. Ink on paper and paper on charcoal both exceed 4.5:1 contrast.

## Type and spacing

Headings use `ui-rounded, "Arial Rounded MT Bold", system-ui` to recall a marked notebook title. Body uses `ui-monospace, "SFMono-Regular", Consolas, monospace`, which helps players scan hotkeys and extracted lines. The spacing scale is 4, 8, 12, 16, 24, 32, 48, 64px. Body text is 16–18px with 1.5 line-height.

## Interaction grammar

Dashed pencil borders identify things the player may position or select. Solid ink borders identify saved settings. The primary action is a blue “beacon” control. Controls always state their result. The capture rectangle uses a 180ms opacity/transform entrance from its trigger; status lines fade in only. With reduced motion, all changes are immediate.

## Original art

Prompt sheet: a practical paper notebook page at a desk edge; a blue rectangular focus frame around abstract, unreadable game UI glyph blocks; graphite pencil, subtle grid, warm desk light; hand-drawn editorial illustration, no people, no brands, no legible text, no watermark, no logo. Avoid neon gradients, game characters, screenshots, and decorative clutter.

Asset provenance: `assets/src/beacon-notebook.png` is generated with the factory image deployment on 2026-08-28 from the prompt above. It is product art, not a game screenshot. Its WebP derivative is used on the landing page. A generated-art note appears in the footer.

`public/beacon-social.jpg` is a 1200×630, 26 KB editorial crop composed locally from that same original notebook asset on 2026-08-28. It is used only for the social card, so social previews retain the product's original art without introducing an external image or text baked into the image.
