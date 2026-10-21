# Troubleshooting

- **runtime failed to boot** → the error lists page errors; usually a scene module syntax error or a missing template name.
- **QA overflow keeps failing** → dump that frame's manifest entry (box w/h, px, lines) before changing code: `node -e "import('./engine/render.mjs').then(async R=>{const p=await R.openProject(R.resolveProject('<slug>'),{});console.log((await R.frame(p.pages[0],<frame>,{png:false})).manifest.texts);await p.close()})"`.
- **Determinism fails** → a scene uses Date/Math.random/timers or keeps state between calls; use `api.random(i)` and derive everything from `t`.
- **Pixel contrast flags a stroke colour** → keep ≥ 8 px between a text box and any outline.
- **Cache never hits** → something in the hash changes each run (e.g. a generated file under templates/scenes/lib).
- **Mixer "Cannot select channel layout"** → add `aformat=channel_layouts=stereo` after resampling.
- **ElevenLabs 401/422** → check the key/voice ID in `.env` (never print them); 422 often means an empty or too-long text.
- **archify-diagram text fails QA (overflow/overlap)** → the layout is too dense for 36 px text at 1080p. Split it over scenes with `props.focus`, shorten labels in the Archify spec, or set `edgeLabels: false`. See `archify.md`.
- **`npm run diagram:layout` cannot find archify** → set `ARCHIFY_BIN` to `bin/archify.mjs` in your Archify checkout (see `archify.md`). The committed sample layout renders without it.
- **Narration is required by mix** → only when `project.json` has `audio.narration: "elevenlabs"`. Remove it (or pass `--allow-no-narration`) for a silent/SFX-only video.
