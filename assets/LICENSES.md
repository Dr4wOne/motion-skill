# Asset licences

| Asset | Source | Licence | Used for |
|---|---|---|---|
| `assets/fonts/SourceSerif4-latin-wght-{normal,italic}.woff2` | Source Serif 4 (Adobe), via npm `@fontsource-variable/source-serif-4@5.3.1` | SIL OFL 1.1 (`OFL-SourceSerif4.txt`, as distributed by Fontsource) | display and body text |
| `assets/fonts/JetBrainsMono-latin-{400,700}.woff2` | JetBrains Mono, via npm `@fontsource/jetbrains-mono@5.3.0` | SIL OFL 1.1 (`OFL-JetBrainsMono.txt`) | code, commands, data values |
| `assets/fonts/SpaceGrotesk-latin-{500,700}.woff2` | Space Grotesk, via npm `@fontsource/space-grotesk@5.3.0` | SIL OFL 1.1 (`OFL-SpaceGrotesk.txt`) | starter wordmark, intro/outro headlines |
| SFX and sonic logo | synthesised in code (`engine/audio/sfx.mjs`, `sonic-logo.mjs`) at render time | this repo (MIT) | transitions, reveals, brand sting |

The fonts are unmodified latin subsets. The OFL allows bundling and redistribution with software; the font files may not be sold on their own.

Music: none ships. Add files to `assets/music/` only with a complete `assets/music/PROVENANCE.md` entry (`skills/motion-skill/references/music.md`).

To swap fonts, add OFL (or similarly licensed) `.woff2` files here with their licence text, add a row above, and point `styles/default.style.json` → `fonts` at them.
