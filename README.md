# Composer OS — Generative Music System

**Windows:** [READ ME BEFORE INSTALLING COMPOSER OS ON WINDOWS](docs/windows/README-BEFORE-INSTALLING.md). A GitHub Release installer is not published yet.

## Overview

Composer OS is a **deterministic**, **seeded** compositional pipeline: **style engines**, **harmonic palettes**, **songwriter slices**, and **export templates** for generative lead-sheet and ensemble music. The primary TypeScript engine lives under **`engines/composer-os-v2/`**; apps include the **Composer OS** web UI and **Electron** desktop wrapper sharing the same **`app-api/`** contract.

- **Current version:** **V44** (**StylePanel** — Harmonic Voice + Rhythm Engine selectors **`docs/COMPOSER_OS_PLAYBOOK.md`**); **V43** blend lab (**all five** rhythm engines, Engine A/B, LCM grid **`docs/RHYTHM_ENGINES.md`**); culture rhythms **V40–V42**; **`docs/GREEK_REBETIKO_HANDBOOK.md`** §§1–10; Song Mode **`songFormRhythmTypes`** / **`rhythmPulseGrid`** / **`rhythmLayerMerge`**.
- **Quality gate (local):** **`npm run test:composer-smoke`** — **163** tests passed / **0** failed across **42** labelled suites (`engines/composer-os-v2/tests/runSmokeTests.ts` allowlist).
- **Repository path:** `C:\Users\mike\Documents\Cursor AI Projects\creative-engines\`

**Shipped rhythm engines (prefix · presets · version)**

| Prefix | Engine | Presets (approx.) | Ver |
|--------|--------|-------------------|-----|
| **`fk:*`** | Fela Kuti Afrobeat (Tony Allen grids) | ~12 feels/patterns | **V37** |
| **`gr:*`** | Greek Rebetiko (additive metres) | 13 roadmap IDs (bundle in repo) | **V38** |
| **`br:*`** | Brazilian (bossa, samba, baião, son-clave) | **9** | **V40** |
| **`sl:*`** | New Orleans Second Line | **8** | **V41** |
| **`cu:*`** | Cuban / Afro-Cuban | **8** | **V42** |

**Blend Engine (V43)** — Generate → Song Mode → **Rhythm blend lab**: cross-blend **any two** of the five engines via **Engine A / Engine B** dropdowns, per-engine presets, **Song form** (sections alternate engines) or **Layer blend** (two stacked GM parts). **`mergeRhythmLayers()`** uses **LCM** pulse normalisation when bar grids differ (e.g. 16 vs 18 steps); UI warns when pair **LCM > 144**. See **`docs/RHYTHM_ENGINES.md`**.

**StylePanel (V44)** — **Harmonic Voice** (songwriter / harmonic palette) and **Rhythm Engine** (culture groove) are **separate** selectors, so combinations like **Bill Evans + Brazilian** or **Debussy + Rebetiko** are valid without tying harmony ID to a single rhythm family.

**Deep harmonic voices (handbook)** — Shipped **Harmonic Voice** ids with full Style Panel depth include **Wayne Shorter**, **Gil Evans**, **Maria Schneider**, **John Coltrane**, **Pat Metheny**, **Henry Threadgill**, **Charles Mingus**, **Morricone**, **Herrmann**, **Badalamenti**, **Quincy Jones (film)** (`quincy_jones_film`). **Songwriter** presets and **Harmonic Voice** are two layers (colour vs architecture); see **`docs/DEEP_HARMONIC_VOICES_GUIDE.md`**.

**Exports (Documents \\ Composer OS Exports \\)** — **`Fela Kuti Rhythms\\`**, **`Greek Rhythms\\`**, **`Brazilian Rhythms\\`**, **`Second Line\\`**, **`Cuban Rhythms\\`**; rhythm-blend MusicXML → **`Blended Rhythms\\`** (**`outputPaths.ts`**).

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

**Shipped harmony modules:** **33+** (`engines/composer-os-v2/core/song-mode/*Slice.ts`). Generate UI **Shipped (full slice)** row includes **`billy_strayhorn`**, **`kenny_wheeler`**, **`henry_threadgill`**, and the jazz/big-band core below.

### Fully implemented v2 composers (reference list)

Big-band / jazz Song Mode slices with golden-path precompute (receipt prefixes in parentheses):

**Maria Schneider** (`ms:*`) · **Gil Evans** (`ge:*`) · **Bob Brookmeyer** (`brk:*`) · **Wayne Shorter** (`ws:*`) · **Frank Zappa** (`fz:*`) · **Charles Mingus** (`cm:*`) · **Duke Ellington** (`de:*`) · **Count Basie** (`cb:*`) · **Thad Jones** (`tj:*`) · **Oliver Nelson** (`on:*`) · **Sammy Nestico** (`sn:*`) · **Clare Fischer** (`cf:*`) · **Quincy Jones** (`qj:*`) · **Bill Evans** (`be:*`) · **John Coltrane** (`jc:*`) · **Thelonious Monk** (`tm:*`) · **Barry Harris** (`bh:*`) · **Andrew Hill** (`ah:*`) · **Charlie Parker** (`cp:*`) · **Jim Hall** (`jh:*`) · **Herbie Hancock** (`hh:*`) · **Pat Metheny** (`pm:*`) · **McCoy Tyner** (`mt:*`) · **Miles Davis** (`md:*`) · **Antônio Carlos Jobim** (`aj:*`) · **Henry Threadgill** (`ht:*`) · **Kenny Wheeler** (`kw:*`) · **Billy Strayhorn** (`bs:*`) · **Jan Garbarek** (`jg:*`) · **Carla Bley** (`cbl:*`) · **Bill Holman** (`bh:*`) · **Don Sebesky** (`ds:*`).

**Also fully implemented (non-list above):** Pat Martino — **`martino_linear`** MusicContext preset (linear solo producer, not a Song Mode slice).

**Partial / UI only:** Manny Albam · Gerald Wilson · Neal Hefti (arranger dropdown only).

Full parameter names and one-line identities: **`docs/COMPOSER_HANDBOOK.md`** § Master composer reference (v1.9.0).

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

### George Gershwin (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/gershwinSlice.ts` |
| **Primary id** | `gershwin` (aliases e.g. **`george_gershwin`**) |
| **Contexts** | **`gershwinContext`** / **`GenerateRequest.gershwinContext`**: **`song_aaba`** \| **`rhapsody`** \| **`rhythm_changes`** (default **`song_aaba`**). |
| **Devices / receipts** | **`gg:*`** — AABA / rhapsody / rhythm grid (**d1**), blue-note colour (**d2**), syncopated anticipation (**d3**), chromatic passing (**d4**), minor-third modulation (**d5**); see **`gershwinEffectiveHarmonyBars`**. |
| **Chord pools** | **`gershwin_song_aaba`**, **`gershwin_rhapsody`**, **`gershwin_rhythm_changes`** in **`songModeBuilder`** when primary is Gershwin (**`seed % 3`**). |
| **Style surface** | **`applyGershwinStyleSurface`** — syncopation **+0.26**, density **+0.12**, space **+0.14**, cadence softness **+0.18**. |

### Arvo Pärt (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/arvoPartSlice.ts` |
| **Primary id** | `arvo_part` (aliases e.g. **`arvo`**, **`part`**) |
| **Contexts** | **`arvoPartContext`** / **`GenerateRequest.arvoPartContext`**: **`fur_alina`** \| **`spiegel`** \| **`fratres`** (default **`fur_alina`**). |
| **Devices / receipts** | **`ap:*`** — tintinnabuli M/T pairing (**d1**), silence as structure (**d2**), additive rhythm (**d3**), register arch (**d4**), triadic transformation (**d5**); pedal **`ap:pedal_bass`**; **`arvoPartEffectiveHarmonyBars`**. |
| **Chord pools** | **`arvo_part_fur_alina`**, **`arvo_part_spiegel`**, **`arvo_part_fratres`** in **`songModeBuilder`** when primary is Arvo Pärt (**`seed % 3`**); **triads only** (slice strips extensions). |
| **Style surface** | **`applyArvoPartStyleSurface`** — space **+0.45**, density **−0.28**, syncopation **−0.22**, cadence softness **+0.38**. |

### Prince (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/princeSlice.ts` |
| **Primary id** | `prince` |
| **Contexts** | **`princeContext`** / **`GenerateRequest.princeContext`**: **`purple_rain`** \| **`sign_o_times`** \| **`kiss`** (default **`purple_rain`**). |
| **Devices / receipts** | **`pr:`** — minor vamp (**d1**), gospel cadence (**d2**), chromatic bass (**d3**), stop-time (**d4**), bridge modulation (**d5**); plus **`pr:borrow_flat_colour`**; **`princeEffectiveHarmonyBars`**. |
| **Chord pools** | **`prince_purple_rain`**, **`prince_sign_o_times`**, **`prince_kiss`** in **`songModeBuilder`** when primary is Prince (**`seed % 3`**). |
| **Style surface** | **`applyPrinceStyleSurface`** — syncopation **+0.28**, density **+0.14**, space **+0.18**, cadence softness **+0.16**. |

### Beatles (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/beatlesSlice.ts` |
| **Primary id** | `beatles` |
| **Contexts** | **`beatlesContext`** / **`GenerateRequest.beatlesContext`**: **`merseybeat_1962`** \| **`rubber_soul_1965`** \| **`abbey_road_1968`** (default **`merseybeat_1962`**). |
| **Devices / receipts** | **`bt:*`** — AABA / section B (**d1**), flat-side modal (**d2**), co-tonic switch (**d3**), chromatic mediant (**d4**), suite form (**d5**); **`precomputeBeatlesEffectiveHarmonyBars`**. |
| **Chord pools** | **`beatles_merseybeat_1962`**, **`beatles_rubber_soul_1965`**, **`beatles_abbey_road_1968`** in **`songModeBuilder`** when primary is Beatles (**`seed % 3`**). |
| **Style surface** | **`applyBeatlesStyleSurface`** — density **+0.08**, syncopation **−0.06**, space **+0.12**, cadence softness **+0.22**. |

### Fela Kuti (3 contexts)

| | |
|--|--|
| **Slice** | `engines/composer-os-v2/core/song-mode/felaKutiSlice.ts` |
| **Primary id** | `fela_kuti` |
| **Contexts** | **`felaKutiContext`** / **`GenerateRequest.felaKutiContext`**: **`zombie_1977`** \| **`water_no_get_enemy`** \| **`lady_1972`** (default **`zombie_1977`**). |
| **Devices / receipts** | **`fk:*`** — static vamp (**d1**), call–response (**d2**), pentatonic layer (**d3**), parallel horns (**d4**), polymetric grid (**d5**); **`precomputeFelaKutiEffectiveHarmonyBars`**. |
| **Chord pools** | **`fela_kuti_zombie_1977`**, **`fela_kuti_water_no_get_enemy`**, **`fela_kuti_lady_1972`** in **`songModeBuilder`** when primary is Fela Kuti (**`seed % 3`**). |
| **Style surface** | **`applyFelaKutiStyleSurface`** — syncopation **+0.32**, density **+0.18**, space **−0.14**, cadence softness **+0.38**. |

### Greek Rebetiko

| | |
|--|--|
| **Primary id** | **`greek_rebetiko`** |
| **Rhythm docs** | **`docs/GREEK_REBETIKO_HANDBOOK.md`** — **§§1–10** (presets, additive metres, XML, LCM merge, song form, UI, notation); **`docs/RHYTHM_ENGINES.md`** — Afrobeat vs Rebetiko, pulse grids, policies. |
| **UI** | **`GreekRhythmControls`** — preset preview grid + **Download MusicXML** (`exportGreekRhythmToMusicXml`). |
| **Style surface** | **`SONGWRITER_STYLE_PROFILES.greek_rebetiko`** — modal/minor colour bias, high syncopation; guitar-centric comp (**`songwriterCompProfile`**). |

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
| **V37** | **Fela Kuti** Tony Allen percussion — **`afrobeatRhythmEngine`** bar-edge quantise / phase wrap / missing-feel fallback; **`FELA_KUTI_PERCUSSION_HANDBOOK.md`**; Sibelius sample export script; **`fk:*`** feel tags documented in playbook |
| **V38** | **Greek Rebetiko** — **`GREEK_REBETIKO_HANDBOOK.md`** (preset roadmap table, additive-metre diagrams); **`greek_rebetiko`** Song Mode writer + **`GreekRhythmControls`** / **`exportGreekRhythmToMusicXml`**; playbook + DOCX sync |
| **V39** | Handbook **§§3–10** (MusicXML § changes, LCM/merge, song form, UI, notation); **`RHYTHM_ENGINES.md`**; playbook/README rhythm-engine links |
| **V40** | **Brazilian** rhythm engine — bossa nova, samba, baião, son-clave; **`BrazilianRhythmControls`** / **`brazilianRhythmSlice`**; export **`Composer OS Exports/Brazilian Rhythms/`** |
| **V41** | **New Orleans Second Line** — parade, brass band, Mardi Gras, funk; **`SecondLineRhythmControls`** / **`secondLineRhythmSlice`**; **`Composer OS Exports/Second Line/`** |
| **V42** | **Cuban/Afro-Cuban** — son, rumba, mambo, cha-cha, bolero, mozambique, Afro 6/8; **`CubanRhythmControls`** / **`cubanRhythmSlice`**; **`Composer OS Exports/Cuban Rhythms/`** |
| **V43** | **Blend Engine** — **`RhythmBlendControls`**: all **five** rhythm engines, Engine **A** / **B**, preset lists per engine, Song form + Layer blend, LCM merge + warning **`>144`**; **`blendMusicXmlExporter.ts`**; exports **`Blended Rhythms/`** |
| **V44** | **StylePanel** — independent **Harmonic Voice** + **Rhythm Engine** selectors on Generate (**`StylePanel.tsx`**); arbitrary harmonic × groove pairing |

---

## License

**Internal / development use** — not redistributed as a standalone commercial product unless separately licensed.
