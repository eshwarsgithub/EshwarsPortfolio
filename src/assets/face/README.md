# Living-face stills

One WebP per expression, 640x929 with a transparent background, all pixel-aligned to `rest.webp`.
Each registers itself by filename; anything missing is skipped (or replaced by a stand-in, see `ALIAS` in
`src/components/face/engine.ts`).

- Lids: `rest`, `half`, `closed`
- Gaze: `g_*` (eye directions; their measured iris offsets are in the `GAZE` table in the engine)
- Expressions: grin raised smug shy sick hearts stars snore yawn1 yawn2 yawn sneeze1 sneeze2 whistle1 whistle2 fish gum1 gum2 gum3 gumpop

To add a still: same framing as `rest.webp`, transparent background, drop it here with the expression's name.
A new gaze still also needs a row in `GAZE`.
