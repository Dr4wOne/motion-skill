# Video Blueprint (rule for every video)

Evidence behind each block: `blueprint-rationale.md`. Enforced by `npm run lint:blueprint -- <slug>` (`engine/blueprint/lint.mjs`); a video that fails lint is not shown at G2.

## Jobs (verbs)
Orient · motivate · preview · teach one idea at a time · consolidate · send onward. A block that does none of these is cut.

## Canonical sequence (`block` field on every storyboard scene)
| # | block | job | 5-min default | evidence |
|---|---|---|---|---|
| 0 | cold-open | motivate | ≤ 15 s; a question/claim from the source; no logo | convention (YouTube creator guidance) |
| 0.5 | sting | brand | 4-6 s; channel intro (brand/brand.json); `--no-sting` | convention, mildly *against* (coherence): keep short, skippable |
| 1 | intro | orient | 15-25 s; who, what, "by the end you will…" | moderate (stated objectives) |
| 2 | overview | preview | 30-45 s; thesis in one sentence + one zoomed-out diagram | moderate (advance organizers, pre-training) |
| 3 | roadmap | preview | 10-15 s; 3-7 topics: ≤ 3-word label + ≤ 12-word promise; tracker appears | moderate-strong (signaling) |
| 4..k | topic | teach | 40-90 s each (5-min video: ~40 s) | strong (segmenting) |
| k+1 | full-picture | consolidate | 20-40 s; overview diagram rebuilt | moderate (summaries) |
| k+2 | takeaways | send onward | 15-25 s; ≤ 3 takeaways, one action, next-video tease | convention |
| k+3 | outro | brand, CTA | 15-20 s; channel outro (brand/brand.json); links; end-screen space | YouTube end screens: last 5-20 s, video ≥ 25 s, ≤ 4 elements |

## Topic anatomy (`part` field)
bridge-in (≤ 5 s, "Topic 2 of 5") → concept (one idea, one visual, one analogy) → example → limit (optional, ≤ 8 s) → **recap** (≤ 12 words, spoken and on screen) → bridge-out (≤ 3 s).
Rules: one idea per topic; ≤ 3 new terms; topics ordered by dependency; durations within ±15% of budget.

## Amendments from the evidence check
1. **Preview blocks may name terms before they are defined** (that is what an advance organizer does); the linter checks that no *topic* uses a term defined in a later topic, and none before its defining scene.
2. The recap line is a summary, not retrieval practice; an optional 1-2 s pause before the recap ("What was the key idea?") is allowed and encouraged where the topic budget permits.
3. Sting is the only block the evidence argues against; ≤ 6 s, disabled with `blueprint.sting: false`.
4. Narration lines tagged `[#meta]` (channel name, credits) are allowed only in cold-open, sting, intro, takeaways, outro.

## Files per video
`roadmap.json` {thesis, overviewDiagram, topics:[{id, title, promise, sourceAnchors, budgetSec, glossaryIntroduced, recap}]} · `glossary.json` {term: {definedInScene, definedInTopic}} · `script.md` → `screenplay.md` (`engine/blueprint/screenplay.mjs`) · `storyboard.json`/`.html` (roadmap on top, cards by topic) · `chapters.txt` (`engine/blueprint/chapters.mjs`; YouTube: starts 00:00, ≥ 3 chapters, each ≥ 10 s).

## Linter (`npm run lint:blueprint -- <slug>`): see engine/blueprint/lint.mjs header; exits 1 on any error.

## Quick rules

Sequence: cold open → sting (brand intro) → intro → overview → roadmap → topics → full picture → takeaways → outro (brand outro).

- **roadmap.json**: thesis (≤ 40 words) and 3–7 topics. Each topic has `title` (1–3 words), `promise` (≤ 12 words, one line on the roadmap card), `recap` (≤ 12 words, spoken verbatim and shown on screen), `budgetSec` (±15%), `sourceAnchors`, and `glossaryIntroduced` (≤ 3 terms).
- **Topic anatomy** (`part` on each scene): bridge-in (≤ 5 s), concept, example, limit (≤ 8 s, optional), recap, bridge-out (≤ 3 s; the last topic has none).
- **Roadmap is shown 3 or more times**: the roadmap scene, the tracker in every topic scene (automatic), and a recap strip (template `recap`, mode `strip`) in full picture or takeaways.
- **glossary.json**: no term is used before its defining scene, except in preview blocks (cold open, intro, overview, roadmap).
- **Anchors**: every sentence ends `[#anchor]`. `[#transition]` is for bridges, and `[#meta]` (channel, credits) is allowed only in cold open, sting, intro, takeaways and outro.
- **Chapters**: generated from blocks and topics (`npm run chapters`). They start at 00:00, there are at least 3, and each lasts at least 10 s.
- `npm run lint:blueprint -- <slug>` enforces all of the above. Evidence for the design: blueprint-rationale.md.
