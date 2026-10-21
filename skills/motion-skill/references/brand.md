# Brand (GB gate)

A fresh checkout ships a **neutral starter brand**: the wordmark "Your Channel", a dark palette with one cyan accent, a code-drawn intro (`intro/signal-trace`) and outro (`outro/link-cards`), a sonic logo synthesised in code, and three placeholder links. Nothing in it is an image file: the wordmark is text drawn with Space Grotesk (OFL).

## Files
- `brand/brand.json`: `name`, `palette` (used by brand scenes as `brand.<key>`), `wordmark.text` / `wordmark.marked` (wrap characters in `{{ }}` to draw them in the accent), `intro` / `outro` (`template` under `templates/scenes/`, optional `music` cue id), `endScreen` slots per format.
- `brand/palette.json`: reference colours for `qa/palette` (every colour drawn in brand scenes must be within CIEDE2000 ΔE 5 of one of them). Keep it in sync with `brand.json`.
- `brand/links.json`: links shown in the outro. Only entries with `"status": "confirmed"` and `"outro": true` are drawn, and `qa/links-match` fails on any other link-like text. `"placeholder": true` entries make `npm run doctor` warn. Never guess a handle: ask the human.

## Gate
1. Ask the human for: channel name (wordmark), palette (or keep the starter), links, and whether to keep the starter intro/outro.
2. Edit the three files, then `npm run brand:preview` → `brand/preview/out/preview.mp4` + contact sheet, with QA.
3. Show both; iterate until the human says "approve". Record the decision in the project's RUN-NOTES.md.

New intro/outro designs are ordinary scene templates (pure `render(t)`, all text through `api.text`, colours from `api.brand.palette` via `B('<key>')` in `templates/scenes/lib/brand.mjs`). Export `meta = { duration, sfx: [...] }` so `new-video` and the brand audio stem know their length and sounds.

## Rules
- Use only brand assets you own or have a licence for. Platforms are named in plain text, never with official logos unless the human supplies them under licence.
- Sting ≤ 6 s (the evidence argues against long intros; `blueprint.sting: false` disables it).
