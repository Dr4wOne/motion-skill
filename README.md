# motion-skill

Turn an article into an explainer video **drawn by code**, silent, with sound effects, or narrated. An AI agent reads the article and writes the script, the storyboard and, where needed, small scene programs. Then a deterministic JavaScript function, `render(t)`, draws every frame on a canvas in headless Chromium, and FFmpeg encodes the result. **The model writes instructions; the browser draws the frames.** No image or video generator touches a pixel.

It is packaged as an [Agent Skill](skills/motion-skill/SKILL.md) (`/motion-skill` in Claude Code), with the engine, QA, scene templates, a neutral starter brand and a small demo in the same repo.

What you get per video: a 16:9 MP4 (optional 9:16 cut), SRT captions, YouTube chapters, a screenplay, a contact sheet and a QA report.

## Quick start

Needs Node ≥ 20, git and FFmpeg (with libx264, aac, loudnorm, ebur128).

```bash
git clone <this repo> motion-skill && cd motion-skill
npm ci                               # pinned deps (package-lock.json)
npx playwright install chromium      # the headless browser that draws frames
ffmpeg -version                      # or: sudo apt install ffmpeg | brew install ffmpeg | winget install ffmpeg
npm run doctor                       # health check (exit 0 = ready; "!" lines are optional extras)
npm run demo                         # 5 s end-to-end smoke test → engine/demo/out/demo.mp4
```

`npm run setup` does the first three steps in one go and is safe to re-run.

A slightly longer example (starter intro, title, an Archify diagram, starter outro), silent with code SFX:

```bash
npm run render -- examples/explainer && npm run sfx -- examples/explainer \
  && npm run mix -- examples/explainer && npm run encode -- examples/explainer
# → examples/explainer/out/explainer.mp4
```

## Make a video with the skill

```bash
npm run new -- --slug my-post --source https://example.com/my-post/   # snapshot + project skeleton
```

Then, in Claude Code inside this folder:

```
/motion-skill my-post
```

The skill walks through: brand check → claims → Blueprint (roadmap + glossary) → script → independent fact-check → storyboard → QA → **G2** (storyboard page, animatic) → picture → audio (**G3** only if you turned narration on) → deliver. It stops at every gate and waits for your "approve".

Other agents: `AGENTS.md` holds the rules and `skills/motion-skill/SKILL.md` the workflow; both are plain Markdown. The skill uses this repo's scripts, so run it from a clone rather than copying only the skill folder.

Before your first real video, make the brand yours: edit `brand/brand.json` (name, palette, intro/outro), `brand/palette.json` and `brand/links.json` (the starter links are placeholders), then `npm run brand:preview`.

## Cost

- **Rendering is local and free.** There is no per-frame model call and no image generation. On a multi-core machine a 1080p30 render typically runs faster than real time, and edits re-render only the scenes that changed.
- **Model usage** is the agent's own work: reading the article, writing the script and storyboard, fact-checking and reviewing. Heavy steps run in subagents that return short reports.
- **Narration is optional and off by default.** Silent and SFX-only videos need no API key. If you opt in (ElevenLabs), `npm run narrate -- <slug> --estimate` shows characters, credits and US$ first, nothing is spent before the audio gate, and `ELEVENLABS_MAX_USD` (default $1) caps a run. Copy `.env.example` to `.env` for the key and voice ID.
- No telemetry. The only network calls are the article fetch you ask for and, if you opt in, ElevenLabs.

## Archify diagrams (optional)

[Archify](https://github.com/tt-a1i/archify) computes clean architecture and workflow layouts (boxes, boundaries, routed edges). motion-skill uses it as an **offline layout engine**: `npm run diagram:layout -- <archify-spec.json> --out <layout.json>` calls your locally installed Archify CLI (required: `ARCHIFY_BIN` pointing at its `bin/archify.mjs`; there is no npx fallback) with update checks disabled, and normalises the result. The `archify-diagram` scene template then draws that layout natively in the video style: boxes and boundaries fade in, edges are drawn along their routes, a comet runs along each edge and nodes pulse in a staggered wave, all as a pure function of time.

Archify is not bundled and not required: a committed sample layout (`examples/archify/production-deployment.layout.json`) lets the demo and tests run without it. Details: [`skills/motion-skill/references/archify.md`](skills/motion-skill/references/archify.md).

## Commands

| Command | What it does |
|---|---|
| `npm run setup` / `npm run doctor` | install / health check |
| `npm run new -- --slug s --source <url\|file> [--format 16:9\|9:16] [--length 5m] [--lang en\|pt-BR]` | new project in `projects/` (git-ignored) |
| `npm run board -- <slug>` | resolve storyboard ↔ script: narration, durations, beats, captions |
| `npm run render -- <slug\|dir> [--scene id] [--frames a-b] [--cut name] [--captions] [--preview]` | render (per-scene cache) |
| `npm run check -- <slug\|dir> [--fast]` | all QA → `qa-report.md` + contact sheet |
| `npm run lint:blueprint -- <slug>` | Video Blueprint linter |
| `npm run storyboard -- <slug>` | review page with approve/adjust + copy-feedback |
| `npm run sfx` / `mix` / `encode -- <slug>` | code SFX / final mix at −14 LUFS / mux to MP4 |
| `npm run narrate -- <slug> --estimate \| --preview --yes \| --generate --approved` | optional ElevenLabs narration |
| `npm run chapters` / `screenplay -- <slug>` | YouTube chapters.txt / screenplay.md |
| `npm run brand:preview` | intro + outro preview with QA (brand gate) |
| `npm run diagram:layout -- <spec.json> --out <layout.json>` | Archify layout → normalised JSON |
| `npm run voice-check -- <file>` | measure a voice sample before cloning (optional) |
| `npm run music` / `npm run provenance` | synthesise music cues from public-domain scores / check provenance |
| `npm test` | unit + QA integration tests |

## How it works

`engine/`: timeline, text layout (single source of truth for overflow), seeded PRNG, safe areas, runtime (`render(t)` + a per-frame manifest of every text box and colour), renderer (Playwright workers → FFmpeg segments, cached per scene), QA (`engine/qa/`), audio (`engine/audio/`), Blueprint linter (`engine/blueprint/`), Archify normaliser (`engine/archify.mjs`). `templates/scenes/`: reusable scenes. `styles/default.style.json`: type, palette, spacing and motion tokens. `brand/`: the starter channel brand. Rules for agents: `AGENTS.md`.

QA measures every frame: text overflow and orphans, the 36 px floor, safe areas, contrast (declared and measured pixels), blank stretches, flashes, determinism across browser sessions, duration and codecs, loudness, caption timing, palette and outro links.

## Credits

- [Archify](https://github.com/tt-a1i/archify) by tt-a1i (MIT): optional layout engine; the sample layout was computed by Archify from its own example.
- [taste-skill](https://github.com/Leonxlnx/taste-skill) by Leonxlnx (MIT): the video taste rules adapt its art-direction rules to frames.
- [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (MIT): the engineering principles in `AGENTS.md`.
- Fonts: Source Serif 4, JetBrains Mono, Space Grotesk (SIL OFL 1.1).

Details and licence texts: `THIRD_PARTY_NOTICES.md`, `assets/LICENSES.md`.

## Licence

MIT © 2026 Daniel Baumann (Dr4wOne). Fonts under the SIL OFL 1.1.
