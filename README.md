# Composer OS – Dual Guitar System (Indie Song Mode)

## Overview
This branch introduces a refined dual-guitar architecture for Composer OS Song Mode, focusing on musically valid chordal comping for guitar_2 while preserving engine stability and deterministic output.

Version: v1.0.48 (session 2026-04-28)
Branch: feat/chord-event-guitar2
Tip: `git log -1 --oneline` on this branch for the latest commit hash.

---

## Key Features

### 1. Guitar_2 ChordEvent System
- Enforces 2–4 note voicings only
- Removes duplicate pitch classes
- Prevents accidental 5-note stacks
- Uses a single deterministic ChordEvent pipeline

### 2. Voice Role Guard
- If a measure contains a chord event:
  - No additional weak-beat single notes are added
- Prevents clutter and preserves chord integrity

### 3. Offbeat Cleanup Pass
stripIndieGuitar2StrayV2OffbeatSingleNotes
- Runs after voice-role assignment
- Removes unwanted offbeat single notes (e.g., 0.5, 1.5)
- Preserves chord voicings and strong-beat notes

### 4. Voice-1 Density Thinning
thinGuitar2Voice1InChordMeasures
- In measures where guitar_2 voice-2 has a ChordEvent,
  thins guitar_2 voice-1 to max 2 NoteEvents
- Preserves strong-beat (1 & 3) and longer-duration notes first
- Reduces "two players on one staff" clutter

### 5. Stable Export Pipeline
- Downstream processes do not re-voice chords
- MusicXML output preserves voicings exactly
- Fully compatible with Sibelius and MuseScore

### 6. Phrase Engine (duo golden path) — Stages 2–4 (2026-04-28)
- **Stage 2:** 4-bar phrase-type sequencing and inter-phrase contrast (**`PhraseSequencingType`**) — guitar and bass share **`duoGoldenPathPhraseIntentAtBar`** / aligned **`PhraseIntent`**.
- **Stage 3:** Controlled anticipation — at most one voice-1 onset per bar may shift earlier by **one eighth-note**; skipped on cadence bars; Indie dual-electric route skips Stage 3 for stable chord-density metrics.
- **Stage 4:** Motif rhythm — **phrase 2** of each 4-bar cycle (**`b % 4 === 2`**) **compression** (half durations); **phrase 3** (**`b % 4 === 3`**) **augmentation** (double durations when feasible); **phrase 4 / cadence** (**`b % 4 === 0`**) **displacement** (+½ beat on all voice-1 onsets). Indie dual-electric skips Stage 4 (same gate as Stage 3).

### 7. Wayne Shorter — chorus / bridge motif transforms (2026-04-28)
- Seed-deterministic **one** transform per chorus or bridge section (onset shift, rhythmic augment, or leap nudge); merged into **`motifDevelopmentSummary`**.

### 8. Bar-4 phrase-end cadence (duo golden path)
- **Every** 4-bar boundary: phrase-end cadence lengthens voice 1 toward the bar/phrase end and snaps to a chord tone (runs with Song Mode hook path and standard golden-path duo).

**Songwriter profiles (full golden-path slices):** **`brian_wilson`**, **`stevie_wonder`**, **`radiohead`**, **`james_brown`**, **`joni_mitchell`**, **`sonic_youth`**, **`pat_metheny`**.

### 9. Brian Wilson (Pet Sounds era) songwriter slice (2026-04-28)
- Primary **`brian_wilson`**: Pet Sounds–biased chord pools, melody profile (arch / syncopation / leaps), light guitar shaping, **five harmonic devices** (chromatic-bass half-dim, inverted dominant, verse ♭VII subdominant colour, tonic **i7** mixture bar, semitone-down modulation at verse→chorus/bridge boundaries) layered on **locked** Song Mode harmony when the full progression is fixed — **`brianWilsonPetSoundsSliceReceipt`** / **`brianWilsonPetSoundsDiagnostics`** / **`deviceReceipts`** on **`GenerationMetadata`** (also echoed in output manifests). Implementation: **`engines/composer-os-v2/core/song-mode/brianWilsonPetSoundsSlice.ts`**. See **`docs/CHANGELOG.md`** (**fix:** devices over locked harmony, **2026-04-28**).

### 10. Stevie Wonder (1972–1976) songwriter slice (2026-04-28)
- Primary **`stevie_wonder`**: funk/R&B chord pools, high-syncopation melody profile, **five devices** (Dorian vamp, vi→II→V7sus4→I cadential turns, chromatic bridge sequence, chorus **bII** pivot, pentatonic voice-1 bias) on **locked** duo harmony — **`stevieWonderSliceReceipt`** / **`stevieWonderDiagnostics`** / effective bars on **`GenerationMetadata`**. Implementation: **`engines/composer-os-v2/core/song-mode/stevieWonderSlice.ts`**.

### 11. Radiohead (OK Computer / Kid A era) songwriter slice (2026-04-28)
- Primary **`radiohead`**: modal/minimal chord pools, low-syncopation / asymmetric-form profile, **five harmonic devices** (Phrygian pedal, parallel maj/min blocks, chromatic insertion, borrowed **iv**, absent tonic delay) on **locked** duo harmony — **`radioheadSliceReceipt`** / **`radioheadDiagnostics`** / **`radioheadEffectiveHarmonyBars`** on **`GenerationMetadata`**. Implementation: **`engines/composer-os-v2/core/song-mode/radioheadSlice.ts`**.

### 12. James Brown (funk/soul dominant-centre) songwriter slice (2026-04-28)
- Primary **`james_brown`**: dominant-centre chord pools (**E9**, **D7**, **F9**, **Bb9**, **A9**, **G7**), **I7→IV7** bridge vocabulary, **five devices** (**`jb:`** d1–d5: downbeat anchor, vamp lock, horn-stab rhythm, iv-side bridge, blues tension) + anti-elaboration guards on **locked** duo harmony — **`jamesBrownSliceReceipt`** / **`jamesBrownDiagnostics`** / **`jamesBrownEffectiveHarmonyBars`** on **`GenerationMetadata`**. Implementation: **`engines/composer-os-v2/core/song-mode/jamesBrownSlice.ts`**. C3 **`songModeJamesBrownFunkOverlay`** remains opt-in (rhythm layer; harmony slice does not auto-enable it).

### 13. Joni Mitchell (modal open-tuning) songwriter slice (2026-04-28)
- Primary **`joni_mitchell`**: modal/suspended chord pools (**Dadd9**, **Gsus2**, **Asus4**, **Fmaj(add9)** / **Fadd9**, **Cadd9**, **Gmaj(6/9)**, **Bm11**, **Em(add9)**), **five devices** (**`jm:`** d1–d5: modal field lock, unresolved suspension, non-root bass, Lydian colour, modal centre shift) + anti-elaboration guards on **locked** duo harmony — **`joniMitchellSliceReceipt`** / **`joniMitchellDiagnostics`** / **`joniMitchellEffectiveHarmonyBars`** on **`GenerationMetadata`**; open-tuning pattern strings (**`x57543`**, etc.) live on slice metadata only (not on shared **`ChordEvent`**). Implementation: **`engines/composer-os-v2/core/song-mode/joniMitchellSlice.ts`**.

### 14. Sonic Youth (dual-guitar / alternate-tuning noise harmony) songwriter slice (2026-04-28)
- Primary **`sonic_youth`**
- Implementation: **`sonicYouthSlice.ts`** (**`engines/composer-os-v2/core/song-mode/sonicYouthSlice.ts`**)
- **Two-guitar architecture:** Guitar 1 + Guitar 2 **separate tunings**
- **Chord pools:** **Emadd9**, **sus**, **#11**, **slash**, **alt** vocabulary
- **Devices:** **`sy:alternate_tuning_colour`**, **`sy:two_guitar_register_split`**, **`sy:open_string_drone`**, **`sy:dissonant_dyad_cluster`**, **`sy:asymmetric_phrase_extension`**, **`sy:noisy_cadence_destabilisation`**
- **`sonicYouthChordTypes.ts`** + **`sonicYouthChordGuards.ts`** — additive **`ChordEvent`** extension
- **Eval:** **`npm run eval:sonic_youth`** — markdown summaries under **`output/sonic-youth-eval/`**

### 15. Pat Metheny (ECM / PMG modal–Lydian) songwriter slice (2026-04-28)
- Primary **`pat_metheny`**
- Implementation: **`patMethenySlice.ts`** (**`engines/composer-os-v2/core/song-mode/patMethenySlice.ts`**)
- **Chord pool:** existing **`SONGWRITER_CHORD_POOLS.pat_metheny`** (maj9, maj7#11, add9, sus/13sus, slash bass) — not replaced by this slice
- **Devices (`pm:`):** **`lydian_home`**, **`pedal_shimmer`**, **`diatonic_planing`**, **`sus_float`**, **`modal_sideSlip`**
- **Guards:** ii–V–I flatten, dominant-chain strip, 2-bar minimum hold (per-bar change block), blues-dominant strip — receipts on **`patMethenyAntiElaborationGuards`**
- **Effective harmony:** **`patMethenyEffectiveHarmonyBars`** on **`GenerationMetadata`**; export + disk truth use the same bars as score/MusicXML (**`runGoldenPath.ts`**, **`composerOsAppGeneration.ts`**)
- **Eval:** **`npm run eval:pat_metheny`** — CSV + markdown under **`output/pat-metheny-eval/`**; sample seeds may show **d2**/**d4**/**d5** quiet (non-blocking)

### 16. Harness & product parity (session)
- Full test matrix: chunked **`runAllTests`** + heap on children; **`test:smoke`** gate unchanged.
- **Wyble parity:** B-category guards use **`isGuitarBassDuoFamily`** so **`song_mode`** / **`song_mode_*`** / single-line duo share intended duo-family rules where the engine meant “guitar + bass stack,” not only the literal **`guitar_bass_duo`** id.

**Eval:** **`npm run eval:brian_wilson`** / **`npm run eval:stevie_wonder`** / **`npm run eval:radiohead`** / **`npm run eval:james_brown`** / **`npm run eval:joni_mitchell`** / **`npm run eval:sonic_youth`** / **`npm run eval:pat_metheny`** (repo root) or **`--prefix engines/composer-os-v2`** — songwriter vs **`carole_king`** neutral baseline (where each harness supports it); markdown + CSV under **`output/brian-wilson-eval/`** / **`output/stevie-wonder-eval/`** / **`output/radiohead-eval/`** / **`output/james-brown-eval/`** / **`output/joni-mitchell-eval/`** / **`output/sonic-youth-eval/`** / **`output/pat-metheny-eval/`**.

**Detail:** see **`docs/CHANGELOG.md`** **[2026-04-28]** and **`docs/COMPOSER_OS_ROADMAP.md`** (T2.5–T2.17).

---

## Test Coverage

### Indie Guitar_2 Quality Tests
- All chord events contain 2–4 unique pitches
- No duplicated pitch classes
- Measures with chords contain no offbeat single notes
- 60% or more of chord events land on strong beats (1 & 3)
- indieGuitar2ThinVoice1Peak <= 2

### Build + Validation
- npm run test:smoke — PASS (40 passed / 0 failed) — includes **Brian Wilson (Pet Sounds)**, **Stevie Wonder (1972–76)**, **Radiohead (OK Computer–era)**, **James Brown**, **Joni Mitchell**, **Sonic Youth**, and **Pat Metheny** songwriter slice smokes
- npm run desktop:build — PASS
- MusicXML exports verified valid

---

## Current Musical State

### Strengths
- Clean chordal comping
- Stable and predictable output
- Idiomatic register range
- No structural MusicXML errors
- Tuning labels above each staff in measure 1
- No bass part — two electrics confirmed

### Limitations
- Comping is still somewhat grid-aligned on **guitar_2** (phrase-engine work targets **lead/bass** duo paths first)
- Indie **guitar_2** interaction with **guitar_1** remains a listening/eval focus
- Strong **global** motif identity beyond pilot writers is still roadmap-tier

---

## Next Development Targets (GCE >= 9)

### 1. Motif System
- Extend recurrence/variation evidence beyond pilot Song Mode / duo slices
- Target similarity score >= 0.7 where product gates apply

### 2. Phrase Grammar
- Golden path now enforces **4-bar phrase intent**, **phrase-end cadence on bar 4 boundaries**, and **controlled anticipation** (see CHANGELOG **2026-04-28**); continue tightening **guitar_2** phrase grammar and interaction.

### 3. Guitar_2 Musical Comping
- Phrase-based comp patterns: beat-based, anticipatory, sparse, syncopated
- Interaction with guitar_1 density
- Introduce controlled silence (~20%)

### 4. Rhythmic Identity
- Layer **Stage 3 anticipation** metrics with **guitar_2** comp identity; limit repetitive rhythm loops on the comp staff

---

## Development Philosophy
- Deterministic generation over randomness
- Musical identity > note density
- Phrase-level logic > bar-level correctness
- Interaction > isolation
- Preserve asymmetry at all costs

---

## Status
Stable **Indie dual-guitar** export + chord-quality smoke; duo **golden path** shipped **Phrase Engine** stage 2/3, **bar-4 cadence**, **Wayne Shorter** chorus/bridge motif pass, chunked **runAllTests**, section-shaping eval tables, and **Wyble B-category** `isGuitarBassDuoFamily` parity (**2026-04-28** — see **`docs/CHANGELOG.md`**).
Next phase: deepen **guitar_2** phrasing vs **guitar_1** and motivic identity on the Indie stack.

---

## License
Internal / Development Use
