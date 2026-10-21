# Third-party notices and credits

## Archify (optional dependency, not bundled)
- https://github.com/tt-a1i/archify — MIT License, Copyright (c) 2026 tt-a1i (Archify), Copyright (c) 2025 Cocoon AI.
- Used as an optional, user-installed offline layout engine (`npm run diagram:layout`). No Archify source code is included in this repository.
- `examples/archify/production-deployment.layout.json` and `engine/test/fixtures/archify/raw-architecture.json` are layout output that Archify v3.2.0 (commit 654da74) computed from Archify's own example `examples/production-deployment.architecture.json` (MIT). Labels and geometry are Archify's; the normalised form is ours.
- The comet and staggered-pulse timings in `templates/scenes/archify-diagram.mjs` (1.75 s comet with a 24% tail, 0.16 s step stagger, 2.6 s pulse) follow the values in Archify's viewer motion export; the drawing code is an independent implementation.

Archify licence text:

```
MIT License

Copyright (c) 2026 tt-a1i (Archify)
Copyright (c) 2025 Cocoon AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## taste-skill (rules adapted, not bundled)
- https://github.com/Leonxlnx/taste-skill — MIT License, Copyright (c) 2026 Leonxlnx.
- `skills/motion-skill/references/video-taste-rules.md` adapts rules from taste-skill v2.0.0 (art direction for web pages) to 30 fps canvas frames. Most rules are paraphrased; short phrases are quoted. Each rule cites its source section.
- MIT permission notice for the adapted portions:

  > Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Karpathy-inspired coding guidelines (credited, not bundled)
- https://github.com/multica-ai/andrej-karpathy-skills (plugin `andrej-karpathy-skills` v1.0.0 by forrestchang; declared MIT), based on Andrej Karpathy's observations on LLM coding pitfalls.
- The four engineering principles in `AGENTS.md` are a short paraphrase of its guidelines.

## Fonts (bundled)
Source Serif 4, JetBrains Mono and Space Grotesk under the SIL Open Font License 1.1. See `assets/LICENSES.md` and `assets/fonts/OFL-*.txt`.

## npm dependencies
- `playwright` / `playwright-core` 1.64.1 — Apache-2.0 (installed by `npm ci`, not bundled). Playwright downloads Chromium with `npx playwright install chromium`.

## Research sources
`skills/motion-skill/references/blueprint-rationale.md` cites the learning-science papers and YouTube help pages behind the Video Blueprint.
