# Composer OS — Generative Music System

## Overview

Composer OS is a **deterministic**, **seeded** compositional pipeline: **style engines**, **harmonic palettes**, **songwriter slices**, and **export templates** for generative lead-sheet and ensemble music. The primary TypeScript engine lives under **`engines/composer-os-v2/`**; apps include the **Composer OS** web UI and **Electron** desktop wrapper sharing the same **`app-api/`** contract.

- **Current version:** **V32** (baseline slice wiring: git **`29074f3`** — Debussy + Cole Porter harmony slices, golden-path + locked-truth routing).
- **Quality gate (local):** **`npm run test:composer-smoke`** — **163** tests passed / **0** failed across **42** labelled suites (`engines/composer-os-v2/tests/runSmokeTests.ts` allowlist).
- **Repository path:** `C:\Users\mike\Documents\Cursor AI Projects\creative-engines\`

**Tooling split**

| Tool | Role |
|------|------|
| **Cursor** | Repo edits, TypeScript slices, wiring, docs, commits |
| **Claude Code** | Terminal / **`npm`** runs, parallel audits when Cursor is busy |
| **Perplexity** | External research, library comparisons, publishing quirks |

---

## Architecture

- **Song Mode** — Primary songwriter **`songwriterStyleId`** selects a **golden-path harmony slice** (`precompute*EffectiveHarmonyBars` → effective bars for **`getChordForBar`**, **`customLockedHarmonyRouting`**, **`runGoldenPath`** locked export truth, **`composerOsAppGeneration`**). **`SongwriterStyleProfile`** scalars + registry rules blend with optional **classical overlay** / **style stack**.
- **Duo golden path** — Guitar–bass duo family: **`generateGoldenPathDuoScore`** builds comp + bass; **Phrase Engine V2** (hook-first, **32-bar** gate), **bar-4 / phrase-boundary cadence** shaping, **motif** development and **Wayne Shorter** section transforms where enabled; rhythm overlays **C1–C7** after phrase passes.
- **ECM Chamber surface** — Writer slice **`ecm_chamber`** (`ecmChamberSlice.ts`, receipts **`ec:*`**) plus **`STYLE_ECM`** / **`STYLE_ECM_CHAMBER`** style surfaces (`applyEcmChamberStyleSurface`, optional **`ecmChamberMode`**: `angel_song` | `balanced` | `metheny_scofield`).
- **Smoke tier** — **`npm run test:composer-smoke`**: **163** passed / **0** failed / **42** suites (sync **`CLAUDE.md`** / roadmap when the allowlist changes).
- **Deterministic remix tray** — Same **seed** + request → same MusicXML and metadata; remix / A-B tooling documented in **`docs/COMPOSER_OS_PLAYBOOK.md`** and app Generate UI.
- **Writer recipe cards** — Generate UI shows writer **display name**, **era**, **melody device** pills, and **hover** blurbs for shipped primaries.

**CI on `main`** (GitHub Actions): Python **pytest** for **`engines/wayne-shorter-engine/`** — TypeScript composer smoke is **local** before merge per **`CLAUDE.md`**.

---

## Songwriter slices

**Shipped harmony modules:** **28** (`engines/composer-os-v2/core/song-mode/*Slice.ts`). *(Roadmap copy sometimes cited **25** writers before V32 **Debussy** + **Cole Porter**; disk count is authoritative.)*

Canonical harmony implementations: **`engines/composer-os-v2/core/song-mode/*Slice.ts`** (each paired with **`engines/composer-os-v2/core/goldenPath/<name>Slice.ts`** re-exports where present). **Receipt prefixes** below come from the slice sources — search **`engines/composer-os-v2/core/song-mode/<Slice>.ts`** for full device strings.

### Andrew Hill

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/andrewHillSlice.ts` |
| **Primary id** | `andrew_hill` |
| **Devices / receipts** | **`ah:*`** — open cadences, sus/cluster stripping, tritone fields, pedal centres (angular non-functional harmony). |
| **Style surface** | *(primary-specific surface hooks live in style resolver / surfaces stack; no dedicated `applyAndrewHillStyleSurface` in `songModeStyleSurface.ts`.)* |

### Bacharach

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/bacharachSlice.ts` |
| **Primary id** | `bacharach` |
| **Devices / receipts** | **`ba:*`** — chromatic side-doors, descending slash, deceptive cadences, mixture **`ba:mixture_bVI`**, inner-voice slash, soft extensions (see `precomputeBacharachEffectiveHarmonyBars`). |
| **Style surface** | **`applyBacharachSongModeSurfaceV1`**; with **`STYLE_SOPHISTICATED_POP`**, **`applyBacharachStyleSurface`** (density/sync/cadence nudges). Default profile: **`STYLE_SOPHISTICATED_POP`** (`songModeStyleProfileDefaults.ts`). |

### Barry Harris

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/barryHarrisSlice.ts` |
| **Primary id** | `barry_harris` |
| **Devices / receipts** | **`bh:*`** — cluster-safe labels, tritone subs, sixth–dim colour, bebop dominant colour, cadential ii–V prep (melodic BH scale passes remain in style-modules). |
| **Style surface** | Default duo grammar often Barry-Harris-flavoured; slice-specific surface optional via style stack. |

### Bill Evans

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/billEvansSlice.ts` |
| **Primary id** | `bill_evans` |
| **Devices / receipts** | **`be:*`** — extension-rich symbols, sus/quartal dominant colours, delayed tonic, gentle ii–V preparation (`billEvansEffectiveHarmonyBars`). |
| **Style surface** | **`applyBillEvansStyleSurface`** when **`styleProfile === 'STYLE_MODERN_JAZZ'`** and **`jobimMode` !== true**. |

### Brian Wilson (Pet Sounds)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/brianWilsonPetSoundsSlice.ts` |
| **Primary id** | `brian_wilson` |
| **Devices / receipts** | **`bw:device1…5:*`** — e.g. inverted V / ♭VII subdominant / modal mixture **`bw:device4:modal_mixture_i7`** / semitone section modulation; guitar shaping **`applyBrianWilsonGuitarBarPasses`**. |
| **Style surface** | No dedicated primary **`applyBrianWilson…StyleSurface`** in `songModeStyleSurface.ts`. |

### Charlie Parker

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/charlieParkerSlice.ts` |
| **Primary id** | `charlie_parker` |
| **Devices / receipts** | **`cp:*`** — ii–V–I clarify, tritone sub, turnaround compression, bebop enclosure (`charlieParkerEffectiveHarmonyBars`). **Note:** Cole Porter also emits **`cp:*`** receipts from a separate slice — disambiguate by **`songwriterStyleId`**. |
| **Style surface** | Bebop-lite profile when paired with **`STYLE_BEBOP_LITE`**. |

### Cole Porter

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/colePorterSlice.ts` |
| **Primary id** | `cole_porter` (aliases e.g. **`porter`**) |
| **Devices / receipts** | **`cp:*`** — chromatic descent, diatonic density, ♭VI colour, minor/major shift, beguine feel (`colePorterEffectiveHarmonyBars`). |
| **Style surface** | **`applyColePorterStyleSurface`** — density/sync/space/cadence softness nudges. Default **`STYLE_SOPHISTICATED_POP`**. |

### Debussy

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/debussySlice.ts` |
| **Primary id** | `debussy` |
| **Devices / receipts** | **`db:*`** — parallel planing / whole-tone colour / pentatonic contrast / appoggiatura / arabesque flags (`debussyEffectiveHarmonyBars`, optional **`debussyArabesqueMotifByBar`**). |
| **Style surface** | **`applyDebussyStyleSurface`** — raised density, sync, space, cadence softness. |

### Ornette Coleman (3 period contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/ornetteColemanSlice.ts` |
| **Primary id** | `ornette_coleman` |
| **Contexts** | **`ornetteColemanContext`** / **`GenerateRequest.ornetteColemanContext`**: **`shape_1959`** \| **`free_1961`** \| **`science_1971`** (default **`shape_1959`**). |
| **Devices / receipts** | **`oc:*`** — harmolodic centre (**d1**), asymmetric phrase grid (**d2**), non-resolving turnaround (**d3**), chromatic departure (**d4**), collective density shift (**d5**); see **`ornetteColemanEffectiveHarmonyBars`**. |
| **Chord pools** | **`ornette_coleman_shape_1959`**, **`ornette_coleman_free_1961`**, **`ornette_coleman_science_1971`** in **`songModeBuilder`** when primary is Ornette (**`seed % 3`**). |
| **Style surface** | **`applyOrnetteColemanStyleSurface`** — space **+0.35**, density **−0.12**, syncopation **+0.04**, cadence softness **+0.28**. |

### Béla Bartók (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/bartokSlice.ts` |
| **Primary id** | `bartok` (aliases e.g. **`bela_bartok`**, **`bela`**) |
| **Contexts** | **`bartokContext`** / **`GenerateRequest.bartokContext`**: **`mikrokosmos`** \| **`string_quartet`** \| **`music_for_strings`** (default **`mikrokosmos`**). |
| **Devices / receipts** | **`bk:*`** — axis substitution (**d1**), golden-section climax (**d2**), Bulgarian rhythm accents (**d3**), interval-cell transform (**d4**), arch-form mirror (**d5**); see **`bartokEffectiveHarmonyBars`**. |
| **Chord pools** | **`bartok_mikrokosmos`**, **`bartok_string_quartet`**, **`bartok_music_for_strings`** in **`songModeBuilder`** when primary is Bartók (**`seed % 3`**). |
| **Style surface** | **`applyBartokStyleSurface`** — space **+0.28**, syncopation **+0.18**, cadence softness **+0.22**; per-context **density** nudge (**`mikrokosmos`**, **`string_quartet`**, **`music_for_strings`**). |

### Donald Fagen

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/donaldFagenSlice.ts` |
| **Primary id** | `donald_fagen` |
| **Devices / receipts** | **`df:*`** — Lydian tonic colour, rich dominants, chromatic approach, tritone/backdoor options, sus breathing room; guitar/keys passes in `generateGoldenPathDuoScore`. |
| **Style surface** | **`applyDonaldFagenSongwriterSurface`** — phrase/sync/density + Fagen harmony metadata fields. |

### Duke Ellington

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/dukeEllingtonSlice.ts` |
| **Primary id** | `duke_ellington` |
| **Devices / receipts** | **`de:*`** — jungle growl dominants, chromatic diminished approach, call/response map, parallel planing, shout chorus staging (`ellingtonCallResponseMap`). |
| **Style surface** | **`applyDukeEllingtonStyleSurface`** — orchestral-density pocket metadata. |

### ECM Chamber

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/ecmChamberSlice.ts` |
| **Primary id** | `ecm_chamber` |
| **Devices / receipts** | **`ec:*`** — sparse modal spellings (maj7, add9, sus2, quartal, Lydian #11 phrase starts, m11(no3) ambiguity, phrase-final hang); phrase lengths **4 / 5 / 7**. |
| **Style surface** | **`applyEcmChamberStyleSurface`** + **`ecmChamberMode`** (`angel_song` \| `balanced` \| `metheny_scofield`). |

### Frank Zappa

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/frankZappaSlice.ts` |
| **Primary id** | `frank_zappa` (aliases e.g. **`fz`**) |
| **Devices / receipts** | **`fz:d{1–5}:*`** — polytonal superimposition, metric displacement, xenochrony pitch offset, style juxtaposition, through-composed cut (`FRANK_ZAPPA_DEVICE_*`); **`attachFrankZappaHarmonyContext`** freezes **`HarmonyContext`**. |
| **Style surface** | **`applyFrankZappaStyleSurface`** — six-zone density arc, **`frankZappaContext`**: **`avant_rock`** \| **`big_band`** \| **`futuristic_jazz`** (`GenerateRequest.frankZappaContext`). |

### Herbie Hancock

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/herbieHancockSlice.ts` |
| **Primary id** | `herbie_hancock` |
| **Devices / receipts** | **`hh:*`** — suspended fields, altered dominants, tritone colour-regions, ambiguous tonic rests (Maiden Voyage / Dolphin Dance zone). |
| **Style surface** | Via style stack / resolver when paired with jazz-fusion profiles. |

### James Brown

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/jamesBrownSlice.ts` |
| **Primary id** | `james_brown` |
| **Devices / receipts** | **`jb:*`** — dominant-centre funk vocabulary, vamp / stab / bridge devices + anti-elaboration guards (`jamesBrownEffectiveHarmonyBars`). |
| **Style surface** | Optional **`STYLE_GROOVE_SOUL`** / funk overlays (rhythm layers; harmony slice independent). |

### Jobim

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/jobimSlice.ts` |
| **Primary id** | `antonio_carlos_jobim` |
| **Devices / receipts** | **`aj:*`** — bossa tonic colours, altered dominants, tritone subs, backdoor, passing diminished, Lydian dominant (**not** **`jb:*`** — James Brown). |
| **Style surface** | **`jobimMode`** + **`STYLE_MODERN_JAZZ`** → **`applyJobimStyleSurface`** (replaces **`applyBillEvansStyleSurface`** on that profile). |

### Joni Mitchell

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/joniMitchellSlice.ts` |
| **Primary id** | `joni_mitchell` |
| **Devices / receipts** | **`jm:*`** — modal field lock, unresolved suspension, non-root bass, Lydian colour, modal centre shift (`SONGWRITER_CHORD_POOLS.joni_mitchell` — Dadd9, sus, add9 rows in playbook). |
| **Style surface** | **`STYLE_JONI_MITCHELL`** hooks + **`applyJoniStyleHarmonyPolicy`** where wired. |

### Kate Bush

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/kateBushSlice.ts` |
| **Primary id** | `kate_bush` |
| **Devices / receipts** | **`kb:*`** — add-note prolongations, sus colours, slash pedals, modal mixture (tonal-modal / drone-aware texture). |
| **Style surface** | Primary songwriter surfaces stack with hook-first metadata. |

### Maria Schneider

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/mariaSchneiderSlice.ts` |
| **Primary id** | `maria_schneider` |
| **Devices / receipts** | **`ms:*`** — Lydian modal centre, pedal ostinato, nature arc, colour stack, non-functional planing (`computeSchneiderPhrasePositions`). |
| **Style surface** | **`applyMariaSchneiderStyleSurface`** — pastoral chamber metadata (density/sync/space/cadence). |

### Miles Davis (3 period contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/milesDavisSlice.ts` |
| **Primary id** | `miles_davis` (alias **`miles`**) |
| **Contexts** | **`milesDavisContext`** / **`GenerateRequest.milesDavisContext`**: **`modal_1959`** \| **`quintet_1965`** \| **`electric_1970`** (default **`modal_1959`**). |
| **Devices / receipts** | **`md:*`** — modal centre, time-no-changes / sus ambiguity, groove vamp, cool phrase, harmon-mute colour (`milesDavisEffectiveHarmonyBars`, modal/vamp maps). |
| **Chord pools** | **`miles_davis_modal_1959`**, **`miles_davis_quintet_1965`**, **`miles_davis_electric_1970`** in **`songModeBuilder`** when primary is Miles. |
| **Style surface** | **`applyMilesDavisStyleSurface`** — per-context density/sync/space/cadence nudges. |

### Pat Metheny

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/patMethenySlice.ts` |
| **Primary id** | `pat_metheny` |
| **Devices / receipts** | **`pm:*`** — **`lydian_home`**, **`pedal_shimmer`**, **`diatonic_planing`**, **`sus_float`**, **`modal_sideSlip`** (`patMethenyEffectiveHarmonyBars`; guards ii–V flatten, dominant-chain strip, 2-bar hold). |
| **Style surface** | **`STYLE_PAT_METHENY`** + ECM-flavour surfaces when selected. |

### Radiohead

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/radioheadSlice.ts` |
| **Primary id** | `radiohead` |
| **Devices / receipts** | **`rh:device1…5:*`** — Phrygian pedal, parallel blocks, chromatic insertion, borrowed iv, absent tonic (`radioheadEffectiveHarmonyBars`). |
| **Style surface** | No dedicated **`applyRadioheadStyleSurface`**. |

### Sonic Youth

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/sonicYouthSlice.ts` |
| **Primary id** | `sonic_youth` |
| **Devices / receipts** | **`sy:*`** — alternate tuning colour, two-guitar register split, open-string drone, dissonant dyad cluster, asymmetric phrase extension, noisy cadence (`ChordEvent.sonicYouth` additive grammar). |
| **Style surface** | **`STYLE_SONIC_YOUTH`**; textures via **`sonicYouthTextureEngine`** / grips policy. |

### Sondheim

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/sondheimSlice.ts` |
| **Primary id** | `stephen_sondheim` / registry **`sondheim`** |
| **Devices / receipts** | **`sh:*`** — added-note tertians, chromatic surface, pedal cohesion (dramatic theatre harmony). |
| **Style surface** | Theatre-pop pairing via style stack when selected. |

### Stevie Wonder

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/stevieWonderSlice.ts` |
| **Primary id** | `stevie_wonder` |
| **Devices / receipts** | **`sw:device1…5:*`** — e.g. **`sw:device1:dorian_vamp`**, **`sw:device2:vi_ii_vsus4_i`**, **`sw:device3:chromatic_bridge`**, chorus chromatic pivot, pentatonic voice-1 bias (`stevieWonderEffectiveHarmonyBars`). |
| **Style surface** | Funk/R&B-forward melody profile + guitar passes; no separate single-purpose `applyStevieWonderStyleSurface` in `songModeStyleSurface.ts`. |

### Thelonious Monk

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/theloniousMonkSlice.ts` |
| **Primary id** | `thelonious_monk` (aliases **`monk`**, **`thelonious`**) |
| **Devices / receipts** | **`tm:*`** — ♭9 dominants, tonic maj7/#11, strip lush stacks, deferred cadence (angular harmony). |
| **Style surface** | **`applyMonkStyleSurface`** — angular pocket (density/sync/space/cadence). |

### Wayne Shorter

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/wayneShorterSlice.ts` |
| **Primary id** | `wayne_shorter` |
| **Devices / receipts** | **`ws:d1…d5:*`** — e.g. **`ws:d4:intervalPlannedKeyShift`**, **`ws:d5:harmonicPlateauPedal`** (neighbor chromaticism, bass displacement, wrong-quality dominant-of-expectation, planned key shifts, plateau pedals). |
| **Style surface** | **`STYLE_SHORTER_POST_BOP`** default profile when primary is Wayne (`songModeStyleProfileDefaults.ts`). |

---

## Test coverage

| Gate | Status |
|------|--------|
| **`npm run test:composer-smoke`** | **163** passed / **0** failed (**42** suites) |
| **Desktop build** | **`npm run desktop:build`** — PASS (last verified local tier) |
| **MusicXML exports** | Valid **MusicXML 3.0**-oriented output; host layouts (Sibelius / MuseScore / GP8) remain user-controlled |

---

## Development philosophy

- **Deterministic generation** over randomness (`Math.random` is not used for musical choices).
- **Musical identity** over raw note density.
- **Phrase-level logic** over bar-level correctness alone.
- **Interaction** (ensemble, registers, receipts) over isolated tracks.
- **Preserve asymmetry** — phrase grids, odd meters, and sectional unevenness are features, not bugs.

---

## Version history (brief)

| Version | Highlights |
|---------|------------|
| **V30** | Multi-chorus quality, odd-meter UI, MusicXML Phase 1 import/export groundwork |
| **V31** | Composer smoke tier as merge gate, deterministic remix tray, writer recipe cards, ECM Chamber slice + surfaces, bulk new songwriter slices |
| **V32** | **Debussy** + **Cole Porter** harmony slices (**`29074f3`**), locked-truth wiring; **Composer OS Playbook** handbook refresh (**open** — see **`docs/COMPOSER_OS_PLAYBOOK.md`** / **`.docx`**) |

---

## License

**Internal / development use** — not redistributed as a standalone commercial product unless separately licensed.
