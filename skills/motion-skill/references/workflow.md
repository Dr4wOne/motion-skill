# Workflow details

## 1. Project layout (`projects/<slug>/`)
project.json (format, fps, dials, acceptance) · source/ (article.md, anchors.json, figures/) · claims.json · brief.md · script.md · fact-check.md · storyboard.json · storyboard.html · captions/ · audio/ · scenes/ (custom scene modules, optional) · out/ (git-ignored) · qa-report.{json,md} · visual-review.json · PENDING.md · RUN-NOTES.md

## 2. Claims
`[{ id, section, claim, quote, anchor }]`. `quote` must appear verbatim under `anchor`'s heading. 40–70 claims for a 5-minute cut. Verify by script before writing the script.

## 3. Brief questions (ask the human only if unknown)
Audience? Promise in one sentence? Tone? Call to action? Credit line?

## 4. Script format
```
## s01 hook — A model completes text
> on-screen: ≤ 8 words
> visual: what the picture shows; name the figure file
Sentence one. [#anchor]
Transition with no facts. [#transition]   (max ~6)
```
Written for the ear: short sentences, no parentheses, numbers as spoken. Credits/URLs from the brief are production metadata, not article claims.

## 5. Prompts for the crew (copy, fill the paths)
- scriptwriter: "Write script.md from claims.json + article.md. 690–780 words. Format above. Keep the article's analogies. Nothing beyond the article."
- fact-checker: "You did not write this. Verdict per sentence and on-screen line: supported / stretched / unsupported / wrong-anchor, with a ≤ 20-word evidence quote and a minimal fix."
- visual-reviewer: "Pictures only. Contact sheet + video-taste-rules.md + script intent. JSON findings with severity high/medium/low."
- package-auditor: "Fresh clone in a temp dir: npm run setup && npm run doctor && npm test && npm run demo; report pass/fail per command."

## 6. Gates
G2 shows: storyboard.html, demo15.mp4, animatic.mp4, qa-report.md, visual-review summary, estimated runtime. G3 shows: cost estimate (characters, credits, plan, US$), 10 s preview, voice ID in use (never the key).
