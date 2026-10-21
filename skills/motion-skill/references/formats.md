# Formats and safe areas (engine/safe-area.mjs)

| Format | Size | Safe area | Source |
|---|---|---|---|
| 16:9 | 1920×1080 | central 90% (5% margins) | EBU R 95 graphics-safe |
| 9:16 | 1080×1920 | top 14%, bottom 35%, left 6%, right 9% | Meta Reels ad spec as reported 2026-10 (socialync.io, revid.ai); right widened for the Shorts button rail (reap.video). No first-party organic spec: preview on a phone. |
Type floor: 36 px on a 1080-px short side (both formats). Vertical cuts reuse scene data via `storyboard.cuts.vertical`; templates switch layout on `api.format`.
