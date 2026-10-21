# Audio

Three layers. Only SFX is on by default; a video with no API key and no music is complete.

## Layer A: SFX in code (default, free)
`npm run sfx -- <slug>` → `audio/sfx.wav`. A soft filtered-noise swell at scene changes (−30 dBFS peak) and a quiet tick on beats (−34 dBFS). No hits, no shakes. Brand scenes (sting, outro) also get the sonic logo (`engine/audio/sonic-logo.mjs`, synthesised in code). Then `npm run mix -- <slug>`.

## Layer B: narration (optional, paid, ElevenLabs only)
Off unless `project.json` has `"audio": { "narration": "elevenlabs" }` and `.env` has `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` (a voice from the ElevenLabs library, or your own Instant Voice Clone; check a recording first with `npm run voice-check -- <file>`).
1. `npm run narrate -- <slug> --estimate` (free) → characters, credits, plan, US$. Show it to the human.
2. With consent: `--preview --yes` → `audio/preview.mp3` (about 10 s, about 150 characters, a few cents).
3. **G3.** After an explicit "approve": `--generate --approved` → `audio/clips/<scene>.mp3` + `.json` (word timestamps from character alignment). Cached per scene (text + voice + model). The run refuses to start if the estimate exceeds `ELEVENLABS_MAX_USD` (default 1) or the credits left this month.
4. `npm run board -- <slug>` re-times every scene to its clip (lead + speech + tail); beats and captions follow the real words. Speech is never time-stretched; scene holds change instead.
Cost control: `ELEVENLABS_MODEL_ID` (flash/turbo models cost half), `ELEVENLABS_MAX_USD`. Actual usage is logged in `audio/cost.json`. Never fall back to another paid service. Never print the key.

## Layer C: music (optional)
Only a file with a complete `assets/music/PROVENANCE.md` entry (see `music.md`): `npm run mix -- <slug> --music assets/music/x.flac`. Ducked with sidechaincompress keyed on narration (target ≥ 10 dB under speech).

## Mix
`npm run mix -- <slug>` → `audio/mix.wav`, two-pass loudnorm to −14 LUFS integrated, true peak ≤ −1 dBTP (target −1.5). Report in `audio/mix-report.json`; `npm run check` verifies. Brand stems (sting and outro SFX, sonic logo, music cue) are laid on at a fixed −17 LUFS short-term after the bed is normalised.
