# storyboard.json

```json
{ "version": 1, "slug": "…", "fps": 30,
  "scenes": [ {
    "id": "s03",                    // unique, stable (cache + clip names)
    "block": "topic", "topic": "t2", "part": "concept",   // Video Blueprint fields (blueprint.md)
    "template": "token-strip",      // templates/scenes/<name>.mjs   — or —
    "module": "scenes/s03.mjs",     // project-local scene (export default { render(ctx, t, api, props) })
    "say": "s03:0-4",               // script scene id : sentence range (inclusive)
    "beatWords": ["chopped", "strawberry"], // keywords → props.beats (scene-local s), in order
    "lead": 0.6, "tail": 1.1,       // silence before / after speech (s)
    "minDuration": 12,              // optional floor
    "duration": 8,                  // set by `npm run board`; hand-set it for a scene without narration
    "brand": true,                  // sting/outro only: gets the brand audio stem (SFX + sonic logo + music cue)
    "props": { … }                  // template data (see the comment at the top of each template)
  } ],
  "cuts": { "vertical": { "format": "9:16", "scenes": [ { "id": "s01", "duration?": 8, "props?": {} } ] } } }
```
`npm run board` adds derived fields (do not hand-edit): `narration`, `anchors`, `speech`, `speechStart`, `duration`, `props.beats`, `totalSeconds`.

## Templates (`templates/scenes/`)
General purpose: `title` · `big-idea` (text, caption, strikes) · `stack` (lines) · `pipeline-diagram` (rows, links, note) · `loop-diagram` (nodes, entry, exits, center) · `feed-diagram` (inputs, hub, target) · `compare-3col` (cols) · `split-outcome` · `scope-table` · `status-list` · `file-tree` · `terminal-steps` (steps) · `bridge` · `topic-card` · `roadmap` · `recap` · `takeaways` · `overview-nested` · `outro` (credit, url, next) · **`archify-diagram`** (layoutFile, focus, heading; `archify.md`).

Topic-specific examples (written for an explainer about language models and agent context; reuse their ideas or copy and adapt): `next-token` · `token-strip` · `vector-map` · `attention-arcs` · `probability-bars` · `context-board` · `context-bar` · `stack-buckets` · `inventory-grid` · `event-timeline` · `tool-pile` · `full-picture`.

Brand: `intro/signal-trace` (sting) · `outro/link-cards` (outro with end-screen slots). Chosen in `brand/brand.json`.

## Data files
`props.layoutFile` (repo-relative path, e.g. `examples/archify/production-deployment.layout.json`) is loaded once when the runtime boots and handed to the template as `props.layout`; its content is part of the scene's cache hash.

## Scene contract
`render(ctx, t, api, props)` is a pure function of `t`. Use `api.text()` for all text (manifest + QA), `api.box/line/circle`, `api.enter(at)`, `api.progress(at, dur, ease)`, `api.random(i)` (seeded). No Date, timers, Math.random, network.
