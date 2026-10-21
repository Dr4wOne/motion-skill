# Music (optional)

None ships with this repo. Two routes:

1. **Synthesised from a public-domain score (preferred).** Put a MIDI score in `assets/music/scores/`, describe it and the cues cut from it in `assets/music/cues.json` (format at the top of `engine/audio/music.mjs`), then `npm run music`. The synth (`engine/audio/synth.mjs`) uses no samples or soundfonts. Check on the score's own page that both the composition and that score file are public domain; arrangements and editions can be copyrighted (many popular "classical" scores are CC BY-SA).
2. **A licensed recording** you have the rights to.

Either way every audio file under `assets/music/` needs a complete `assets/music/PROVENANCE.md` block (file, sha256, use, composition, composer, score source with URL + check date, route, performer/synth, recording source, excerpt, modifications, attribution, author, reviewer). `npm run provenance` (and `npm run check`) fails on a missing field, a hash mismatch, a PENDING reviewer, or a reviewer who is also the author. Changing a file changes its hash, so the review resets.
