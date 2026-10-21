# QA checklist (what `npm run check` measures, and what still needs eyes)

| Criterion | Tool | Pass |
|---|---|---|
| Text fits its box, no orphan last word, ≥ 36 px @1080 | qa/overflow (every frame) | 0 flags |
| Text inside safe area | qa/safe-area (every frame) | 0 flags |
| Contrast ≥ 4.5:1 (declared colours every frame + measured pixels on samples) | qa/contrast | 0 flags |
| No blank stretch ≥ 0.5 s, no clipped whites | qa/blank-frames (ffmpeg signalstats) | 0 flags |
| ≤ 3 flashes/s | qa/flashes | pass |
| Same t → same pixels (two sessions, reverse order) | qa/determinism | pass |
| H.264 yuv420p, size, fps, duration, AAC, faststart | qa/duration-sync (ffprobe) | pass |
| −14 ± 1 LUFS, TP ≤ −1 dBTP | qa/loudness (ebur128) | pass |
| Captions ≤ 17 cps, 0.8–7 s, ≤ 2 lines, ±150 ms of words for ≥ 95% | qa/captions | pass |
Needs a different agent: visual review of the contact sheet (0 open high), fact-check (0 unsupported/stretched), comprehension probe (≥ 5/6).
Manual human check: play the final MP4 once with sound.
