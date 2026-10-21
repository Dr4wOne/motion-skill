# Archify diagrams (optional)

[Archify](https://github.com/tt-a1i/archify) (MIT, by tt-a1i; tested with v3.2.0) turns a typed JSON spec into a validated architecture or workflow diagram. Here it is used **only as an offline layout engine**: Archify computes where the boxes, boundaries and routed edges go; the `archify-diagram` template draws that geometry natively, frame by frame, in the video's own style. Archify's HTML viewer is not used, because its live motion runs on CSS animations and wall-clock timers and is not a pure function of `t`.

## Without Archify
Nothing to install. `examples/archify/production-deployment.layout.json` is a committed, normalised layout (computed by Archify v3.2.0 from its own `production-deployment.architecture.json` example). The example project and the tests use it:

```bash
npm run render -- examples/explainer        # includes an archify-diagram scene
```

## With Archify (your own diagrams)
Archify is a user-installed, optional dependency. This repo never downloads, vendors or globally installs it, and never runs its installer.

1. Get Archify yourself (for example, clone `github.com/tt-a1i/archify` at a release tag you have reviewed). Its CLI needs Node ≥ 18 and no `npm install`.
2. Point this repo at the CLI (required): `export ARCHIFY_BIN=/path/to/archify/archify/bin/archify.mjs`. There is deliberately no `npx`/npm fallback: an unrelated npm package named "archify" could be resolved instead (supply-chain risk).
3. Write a spec (start from `examples/archify/pipeline.architecture.json`; Archify's schema requires `meta.output`).
4. Compute and normalise the layout:

```bash
npm run diagram:layout -- examples/archify/pipeline.architecture.json --out examples/archify/pipeline.layout.json
```

The script runs `archify inspect architecture <spec>` or `archify validate workflow <spec> --layout-json` with `ARCHIFY_UPDATE_CHECK_DISABLED=1` and `DO_NOT_TRACK=1`, so no network is used. Archify's own layout checks still apply: if a label overlaps a node, it fails and prints the suggested `labelAt`/`labelDy` fix. Already have Archify's JSON? `npm run diagram:layout -- --raw archify-output.json [--spec spec.json] --out layout.json`.

Only architecture and workflow diagrams export layout JSON. For workflows, node labels, sublabels and lane names come from the spec (pass it as the first argument, as above); lanes become boundaries.

## Normalised layout (`engine/archify.mjs`)
```
{ version: 1, source: { tool: 'archify', type, spec? }, viewBox: { w, h },
  nodes:      [{ id, label, sublabel?, type?, lane?, x, y, w, h, rank }],
  boundaries: [{ id, kind, label, x, y, w, h, wraps: [nodeId] }],
  edges:      [{ id, from, to, label?, variant, points: [[x, y], …], labelAt?, length, step }],
  labels:     [{ text, x, y, w, h }] }
```
`rank` is the breadth-first depth from nodes with no incoming edge (reveal order); `step` orders edges by their source's rank. Units are Archify's viewBox units.

## The `archify-diagram` template
```json
{ "id": "s07", "template": "archify-diagram", "props": {
  "layoutFile": "examples/archify/production-deployment.layout.json",
  "heading": "From the customer to the database",
  "focus": ["clients", "edge", "gateway", "api_a", "api_b", "redis", "postgres"],
  "edgeLabels": true, "start": 0.6, "rankStep": 0.55 } }
```
Motion, all pure f(t): boundaries fade in; nodes enter rank by rank (or at `props.beats[i]` per rank, so `npm run board` can sync them to narration); each edge is drawn progressively along its routed polyline after its source appears; once everything has settled, a short accent comet travels each edge on a loop (period 1.75 s, tail 24% of the edge, staggered 0.16 s per edge step) and node outlines pulse in a staggered wave (period 2.6 s). `reducedMotion` keeps the reveal as fades and drops the comet and pulse. All text goes through `api.text`; colours are palette names.

Fitting rules: the layout is scaled into the content area; boundary labels get their own strip at the top of each boundary; a node box grows (around its centre) only when its label needs it at the 36 px floor; an edge label that would cover a node is left out.

**Density limit.** Archify's layouts are drawn for a browser, at about 12 px labels. A video needs 36 px at 1080p, so a 12-node diagram does not fit one frame (QA overflow/overlap fails). Use `focus` to show 5–8 nodes per scene and build the system across scenes (the overview and full-picture blocks of the Blueprint suit this), or shorten labels in the spec.

## Credit
Layouts are computed by Archify (MIT); the credit lives in `THIRD_PARTY_NOTICES.md`. Crediting it in a video description is a courtesy, not a licence requirement (no Archify code ships in a video).
