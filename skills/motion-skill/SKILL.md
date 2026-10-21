---
name: motion-skill
description: Turn an article, blog post, URL or markdown file into an animated explainer video drawn entirely by code. The model writes a script and a storyboard; a deterministic JavaScript render(t) draws every frame in headless Chromium and FFmpeg encodes it, so there is no per-frame model or image-generation cost. Includes human review gates (spec, brand, storyboard, audio), a Video Blueprint linter, automated QA (overflow, safe area, contrast, flashes, determinism, loudness, captions), code-synthesised SFX, optional paid narration via ElevenLabs (off by default, cost estimate first, hard cap), and optional Archify-computed architecture/workflow diagrams drawn natively. Use when the user asks to make a video from an article/URL/markdown file, to re-render or fix a scene, to cut a vertical 9:16 version, or to animate a system diagram.
argument-hint: "<url|file|slug> [--format 16:9|9:16] [--length 5m] [--lang en|pt-BR]"
license: MIT
---

# motion-skill: article → video

Arguments: `$ARGUMENTS`

You write instructions; the browser draws the frames. A pure function of time renders every frame. No generator ever draws pixels. Read `AGENTS.md` (rules) before starting. Paths below are relative to the repository root (the folder with `package.json`).

## 0. Intake (one question block)
If arguments are missing, ask ALL of these at once: source (URL/file), length (default 5m), format (16:9; 9:16 cut optional), language (en; pt-BR translates the script), audio (SFX in code: yes; narration: none by default, ElevenLabs only if the user opts in; music: none unless a cue with complete provenance exists), style dials (DESIGN_VARIANCE 4 / MOTION_INTENSITY 4 / VISUAL_DENSITY 3). If the user is away, use these defaults and say so at the top of your first report.

## Gates
Four human gates: **G1** spec, **GB** brand (once per channel), **G2** storyboard, **G3** audio (only when narration is on). Each needs an explicit "approve". If the human is away at a gate, write `projects/<slug>/PENDING.md` with the exact decision needed, and stop.

## Steps
0. **Brand (GB).** Read `brand/brand.json` and `brand/links.json`. A fresh checkout has the neutral starter brand ("Your Channel", placeholder links). Before the first real video, ask the human for channel name, palette and links, then `npm run brand:preview` and show the result. Details: `references/brand.md`.
1. **Doctor.** `npm run doctor` must exit 0. Fix ✗ lines first (`npm run setup`).
2. **Ingest.** `npm run new -- --slug <slug> --source <src> [--format ..] [--length ..] [--lang ..]`. A subagent builds `claims.json` from `source/article.md`: every claim has an exact quote and an existing anchor. Details: `references/workflow.md` §2.
3. **Spec gate (G1)**: only for a new kind of video or a changed pipeline; for a routine video, state the defaults and continue.
4. **Blueprint first.** Write `roadmap.json` (thesis, 3–7 one-idea topics) and `glossary.json`. Rules: `references/blueprint.md`.
5. **Script.** A `scriptwriter` subagent writes `script.md` (format in `references/workflow.md` §4): about 150 words/min, one sentence per line, each ending in `[#anchor]`, the article's own voice and analogies.
6. **Fact-check.** A *different* subagent diffs script ↔ article → `fact-check.md`. Fix until 0 unsupported, 0 stretched.
7. **Storyboard.** Write `storyboard.json` (schema and template list: `references/storyboard-schema.md`) using `templates/scenes/` and the article's figure *data*. For a system or process diagram, consider `archify-diagram` (`references/archify.md`). Then `npm run board -- <slug>`, `npm run lint:blueprint -- <slug>` (must pass) and `npm run check -- <slug> --fast` until PASS (max 3 fix rounds, then escalate with `qa-report.md`).
8. **Visual review.** A `visual-reviewer` subagent (pictures only, no code access) reviews `out/<slug>.contact-sheet.png` against `references/video-taste-rules.md`. Fix until 0 open high.
9. **G2 package.** `npm run storyboard -- <slug>` (review page), 15 s demo cut (`--cut demo15` if defined), low-res animatic (`npm run render -- <slug> --preview --fps 10 --captions`). Present, then STOP for approval.
10. **Picture.** `npm run render -- <slug>`, then `npm run check -- <slug>`.
11. **Audio.** Silent/SFX-only (default): `npm run sfx -- <slug>`, `npm run mix -- <slug>`. Narration (opt-in, paid): `npm run narrate -- <slug> --estimate` → show the cost → with consent `--preview --yes` → **G3** → `--generate --approved` → `npm run board -- <slug>` → `sfx` → `mix` → re-render (cache makes this cheap). Details: `references/audio.md`.
12. **Deliver.** `npm run render -- <slug> --captions`, `npm run encode -- <slug>` (+ `--captions`), full `npm run check -- <slug>`, `npm run chapters -- <slug>`, `npm run screenplay -- <slug>`, `RUN-NOTES.md`. Checklist: `references/qa-checklist.md`.
13. **Vertical cut (optional).** `storyboard.cuts.vertical` → add `--cut vertical` to sfx, mix, render, encode and check. Safe areas: `references/formats.md`.

## Cost rules
- No paid call before G3. ElevenLabs is the only paid service and is off by default; estimate first; cap with `ELEVENLABS_MAX_USD` (default $1). Never fall back to another paid service.
- Rendering is local and free: no model or image API is called per frame.
- Heavy work runs in subagents that return ≤ 25 lines + paths. Never paste frames or logs into the main thread.
- Re-render only what changed (segment cache keyed by scene hash).

Trouble: `references/troubleshooting.md`.
