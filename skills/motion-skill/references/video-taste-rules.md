# Video taste rules (adapted from taste-skill v2.0.0 by Leonxlnx, MIT; see THIRD_PARTY_NOTICES.md)
Units: px at 1080p (1920×1080 or 1080×1920); 1 frame = 33 ms. Tokens: see `styles/default.style.json` (bg #0a0a0f, ink #ebe9e4, muted #a8a6a1, accent #40d0f0).
### Hierarchy and type
1. One idea per scene: one dominant element (statement, object, diagram) takes ≥ 40% of the frame; everything else serves it. (taste: SKILL.md "6. Build it, still" Fullness; layout.md §1)
2. ≤ 3 sizes visible per frame, ≤ 5 per video, from 128/88/64/52/40 only; never put two neighbouring steps (e.g. 64 + 52) in one frame. (taste: SKILL.md "Laws of the craft" Type; type.md §2)
3. Nothing under 36 px, ever; running text ≥ 52 px in both orientations; labels 40 px in sentence case. (ours; floor idea from type.md §4)
4. Headlines ≤ 2 lines and about 5 words; statements ≤ 25 words / 3 lines; if longer, split the scene. (taste: SKILL.md "House rules")
5. Measure: landscape body ≤ 62 ch (≈ 1600 px at 52 px); vertical body 28–40 ch, display ≤ 12 ch per line. (taste: type.md §4, adapted for 1080 px width (ours))
6. Display (≥ 64 px): tracking −0.02 to −0.04 em, leading 0.95–1.05; body leading 1.45–1.6; one weight lighter than on light grounds. (taste: type.md §3, §4; colour.md §6)
7. Left-aligned by default; centre at most one scene per video, and then a single element. (taste: SKILL.md "Laws of the craft" Type; layout.md §3)
8. Serif for words; JetBrains Mono only for real code, commands or data values, never as a "technical" label voice. (taste: SKILL.md "House rules" No monospace)
### Space
9. One safe margin per video: 96 px landscape, 72 px sides / 160 px top-bottom vertical; text shares ≤ 3 left edges across the whole video. (taste: layout.md §2, §3; margin values ours)
10. Space above a heading ≥ 2× space below it; gaps between groups ≥ 2× gaps inside a group. (taste: layout.md §4)
11. Empty space is placed (a clean half or third), never filled with ornament; ≤ 1 near-empty rest scene per video. (taste: layout.md §4; SKILL.md "House rules" closing note)
### Palette
12. Ground ≥ 70% of every frame; body text in full ink; muted only for secondary notes (checked ≥ 4.5:1 on bg). (taste: colour.md §3, §6, §8)
13. Accent < 5% of any frame, on ≤ 2 things: the focus of the current beat and at most one recurring marker; never headings or whole sentences. (taste: colour.md §3)
14. Surfaces = one tone step (2–6 L points) above bg; no gradients, glows, shadows, glass, or 1 px lines; graphic strokes ≥ 4 px. (taste: SKILL.md "House rules"; colour.md §4)
### Slop tells to never ship
15. No eyebrows/kickers, pill badges, 01/02/03 step numbers, tiny tracked caps, emoji, icon-in-rounded-square cards, rows of identical cards, styled accent word. (taste: SKILL.md "House rules"; tells.md §2, §4)
16. No neon-accent-plus-glow on near-black, no violet/indigo, no fake dashboards of grey bars, no decorative blobs or crop-mark/grid chrome. (taste: tells.md §1, §2, §4)
### Motion
17. Any held frame must read as a finished poster; motion never rescues a weak layout. (taste: SKILL.md "6. Build it, still"; motion.md intro)
18. Easing: enter/exit ease-out (0.22,1,0.36,1); on-screen travel ease-in-out (0.76,0,0.24,1); long image settles ease-soft (0.33,1,0.68,1); never ease-in, bounce or elastic. (taste: motion.md §2, §3)
19. Durations: reveals 15–27 f (500–900 ms, default 24 f); small UI-like changes 5–8 f; exits ≈ 70% of the entrance. (taste: motion.md §2, §3)
20. Stagger 2–3 f (60–90 ms) in reading order heading → text → picture, ≤ 4 staggered items; rise 24–48 px + opacity. (taste: SKILL.md "9. Move"; motion.md §4; distance scaled ×1.5 (ours))
21. Animate only position, scale (from ≥ 0.95, never 0), opacity, clip; never font size, tracking, line breaks or layout reflow. (taste: motion.md §4 Menu, §6)
22. One signature move per video, tied to the subject; vary entrance manner per scene (rows, mask, count-up), not one fade-up everywhere. (taste: motion.md §1, §5, §7)
23. No meaningless loops (pulsing dots, floating shapes, shimmer); drift/parallax ≤ 8% of the element. (taste: motion.md §4 Scroll-linked, §7)
### Composition across scenes
24. No two consecutive scenes share a layout (split, statement, full-bleed, list, diagram…); a layout used ≥ 3× reads as template. (taste: layout.md §5; tells.md §5)
25. Alternate dense/sparse and type/picture; break the system once on purpose (one centred line, one inverted ink scene). (taste: layout.md §1, §5)
### Dials, 1–10 (ours: v2 has no dials; our setting VARIANCE 4, MOTION 4, DENSITY 3)
| Dial | Low 1–3 | Mid 4–6 | High 7–10 |
|---|---|---|---|
| DESIGN_VARIANCE | 2 layouts alternate, 1 anchor line | 4–5 layouts, 2 anchors, 1 system break | ≥ 6 layouts, 3 anchors, off-centre and inverted scenes |
| MOTION_INTENSITY | opacity only, 24 f, no stagger | rise + 2–3 f stagger, 1 signature move | masks/shutters per scene, still ≤ 4 staggers, no bounce |
| VISUAL_DENSITY | 1 element + ≤ 12 words/frame | ≤ 3 elements, ≤ 25 words | ≤ 5 elements, ≤ 40 words, sizes still ≥ 36 px |
