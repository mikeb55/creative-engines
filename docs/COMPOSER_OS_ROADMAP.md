# Composer OS Roadmap [2026-04-10]

**Canonical handoff doc for assistants (e.g. Claude).** Detail also lives in [CHANGELOG.md](CHANGELOG.md), [README.md](../README.md), and [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md). **Update this file’s title date** when you refresh the roadmap.

**Convention:** Whenever the user asks for a “roadmap,” use the title **`Composer OS Roadmap [YYYY-MM-DD]`** (snapshot date, typically today) and align content with this file or replace sections intentionally.

---

## Product scope (Composer OS V2)

- **Core:** `engines/composer-os-v2/` — single pipeline: preset → planning → score → MusicXML → gates → readiness.
- **Apps:** `apps/composer-os-app`, `apps/composer-os-desktop` — call **app API** (`app-api/`), not raw core only.
- **Modes matrix (honest):** see `app-api/releaseMetadata.ts` — duo / ECM / Song Mode / riff / Wyble / **Big Band** / **String Quartet** = **full ensemble MusicXML** (**planning JSON** fallback on failure). **String Quartet** is **COMPLETE** (strings + piano harmony staff, section markers, chord symbols on piano, import fix for `SQ_PART_*`). **Big Band + String Quartet:** piano part-list naming (`Piano` / `Pno.` / `keyboard.piano`, MIDI ch. 1 program 1) and **Song Form** + bar-length select (16/24/32) wired in Generate.
- **Song Mode — writers & arrangers:** `core/song-mode/` ships a **typed songwriter + arranger rule catalogue** (registry + resolution + optional **songwriter × arranger** pairing). Full detail under **Past → Songwriters & arrangers**; **Generate UI** still lighter than the engine surface (see **Current** / **Future**).

---

## Past (delivered)

### Foundation & export

- **V9.0 chord baseline:** unified parsing/normalization (#19); Sibelius-safe MusicXML rhythm (undotted decomposition); multi-voice export discipline.
- **Golden Path:** Guitar–Bass Duo 8-bar default; 16/32-bar long-form; optional modulation planning for 32-bar route.
- **ECM Chamber:** full MusicXML golden path (`ecm_chamber`), Metheny vs Schneider feel scoring, ECM-specific style stack.
- **Research backlog (not implemented yet):** Perplexity research bundle **ECM, Bacharach, Barry Harris** — local file `c:\Users\mike\Documents\Perplexity Research\ECM_Bacharach_BarryHarris_Research.md`. **When refreshing this roadmap or extending ECM chamber feel, pop songcraft, or jazz pedagogy-style harmony in-app,** use it as a reference; assistants should remind the user to implement from this source when roadmap discussions touch those areas.
- **Key signatures (V3.4):** infer / override / hide from harmony API.

### Guitar polyphony (Phase 18.2)

- **18.2A–B:** Voice 2 polyphony, Sibelius/GP8-safe export, span-based continuity, rhythm footprint (bar-level planning).
- **18.2C (partial, historical):** validators/sweep/pitch floor; some bass musical issues deferred to phrase layer.
- **18.2D (2026-04-09):** Bass phrase intelligence — rhythmic cell triple-break, contour overuse break, motif echo repair (bars 1–8 vs guitar), walking density cap; behaviour gates + **`npm run test:duo`** + **`npm run test:bass`** passing. See [CHANGELOG.md](CHANGELOG.md).
- **Wyble Voice 2 inject (single-line duo):** `injectGuitarVoice2WybleLayer` gated with **`isGuitarBassDuoFamily`** so **`guitar_bass_duo_single_line`** receives the same inner-voice injection path as standard duo (`guitarVoice2WybleLayer.ts`).
- **18.2E (2026-04-07):** Phrase-arrival gate loosened (±2 semitones); 24-bar forms skip that gate; 32-bar checks phrase 1 only; bass **written** pitch offset for Sibelius (`acoustic_upright_bass`, export −24 MIDI vs score + `clef-octave-change` -1).

### Voice 2 counterpoint rewrite (2026-04-09)

- Full Wyble contrapuntal rules: contrary motion, stepwise movement, guide tones, phrase arcs
- Pre-planned melodic goal pitches across all 32 bars
- Rhythmic independence against Voice 1
- Clash prevention, repeated pitch prevention
- Range expanded C2–A3
- Breathing space validator bypassed for guitar_bass_duo
- All gates passing, Shareable

### Form & app wiring

- **Phase 19:** Song Form UI, `formId` → engine, rehearsal marks in MusicXML; bar cap ≤32 in UI; longer forms staged (e.g. Phase 19.1).
- **24-bar end-to-end (2026-04-07):** `formId` on API `req_`, chord/bar validation for 24-bar through-composed forms, MusicXML enclosure schema fix (`rehearsal`).

### Song Mode (structural + realisation)

- **compile:** `runSongMode` → `CompiledSong`, lead-sheet contract, songwriting rules from bundled research (`core/song-mode/`).
- **realise:** `runSongStructure` → `runGoldenPath` as **guitar_bass_duo** with Song Mode flags → **MusicXML** + universal lead sheet.
- **Songwriter id → harmony:** `wayne_shorter` enables **`shorterMode`** chord-tone behaviour (upper extensions), not the Python `wayne-shorter-engine`.

### Songwriters & arrangers (Song Mode rules layer) — **delivered in core**

- **Typed catalogue:** `songwritingResearchTypes.ts` defines **`SongwriterRuleId`** (pop/soul writers, indie/alt bands, jazz writers, **big-band and studio arrangers** — e.g. Duke Ellington, Strayhorn, Gil Evans, Thad Jones, Nestico, Quincy Jones, Brookmeyer, Schneider, Clare Fischer, Albam, Nelson, Gerald Wilson, Hefti, Sebesky — plus classical-era names used as song-style ids), **`AuthorRuleId`** (lyric craft: Webb, Pattison, Perricone), and **`ClassicalSongRuleId`** overlays.
- **Rule bundles:** `songwriterRuleRegistry.ts` maps each id to concrete **`SongwritingRuleEntry`** rows (harmony / form / melody / hook / lyric / rhythm); **`applySongwritingRules`** consumes the resolved id set with bundled research prose in `Songwriting.md` (via parser).
- **Style resolution:** `songwriterStyleResolver.ts` — **primary** + optional **secondary** (~35% weight on the blended **`SongwriterStyleProfile`**), optional **author** and **classical** overlays, deterministic **`resolvedRuleIds`** + **`styleFingerprint`**; wired from **`buildCompiledSong`** (`songModeBuilder.ts`).
- **Songwriter × arranger pairing:** `stylePairingResolver.ts` — when **`stylePairing`** is passed into **`buildCompiledSong`**, soft domain weights plus Big Band **era ↔ arranger** alignment heuristics (non-blocking metadata / nudge).
- **Vocal lead sheet (2026-04-10):** Python **`songwriting_bridge`** + **`cli_export_lead_sheet.py`**, app checkbox **Include vocal lead sheet**, bridge called from generation — see [CHANGELOG.md](CHANGELOG.md). **NOTE:** vocal file path not yet surfacing end-to-end in the app; **data pipeline gap** between **`CompiledSong`** and bridge input — treat as **wired, integration incomplete**.

### Other presets

- **Riff Generator:** short-loop MusicXML to library path.
- **Wyble Etude:** Jimmy Wyble engine → MusicXML (chord resolution required).
- **Research backlog (not implemented yet):** Perplexity research **Slonimsky / pattern systems** — local file `c:\Users\mike\Documents\Perplexity Research\Slonimsky Engine.md`. **When refreshing this roadmap or building melodic substitution, line generation, or scale/chord pattern tooling,** use it as a reference; assistants should remind the user to implement from this source when roadmap discussions touch Slonimsky-based or systematic pattern engines.

### Big Band (2026-04-07) — **COMPLETE**

- **App wiring:** `runBigBandRealisation` after planning → **full 7-part ensemble MusicXML** when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Alto Sax, Tenor Sax, Trumpet, Trombone, Piano, Double Bass, Jazz Drums (percussion clef, MIDI channel 10 — confirmed).
- **Chords / UI:** chord symbols on piano staff; **Generate** chord input wired.
- **Piano staff (export):** part name **Piano**, abbreviation **Pno.**, `instrument-sound` **keyboard.piano**, MIDI channel **1**, program **1** (`bb_piano`).
- **Verification:** `engines/composer-os-v2/scripts/bigband-verify.ts` — **11/11** checks.
- **Research backlog (not implemented yet):** Perplexity deep research on **jazz eras / styles** — local file `c:\Users\mike\Documents\Perplexity Research\jazz-era.md`. **When refreshing this roadmap or deepening Big Band (and other jazz) harmonic and stylistic behaviour,** use it as a reference; assistants should remind the user to draw from this source when roadmap discussions focus on jazz-era vocabulary, arranging norms, or era-accurate defaults beyond current chord pools.
- **Research backlog (not implemented yet):** Perplexity deep research **Big Band** (composers, sections, arranging vocabulary — complements engine rule shapes under `engines/composer-os-v2/core/big-band/`) — local file `c:\Users\mike\Documents\Perplexity Research\BigBandResearch.md`. **When refreshing this roadmap or extending Big Band rules, density, or orchestration defaults,** use it as a reference; assistants should remind the user to merge or reconcile with engine Big Band research when roadmap discussions focus on professional arranging depth.
- **Scope:** behavioural scoring — not full professional arranging.

### String Quartet (2026-04-07) — **COMPLETE**

- **App wiring:** `runQuartetRealisation` after planning → **full ensemble MusicXML** (strings + **piano** reduction staff) when the ensemble export pipeline passes; **planning JSON** if realisation or export fails.
- **Parts:** Violin I, Violin II, Viola, Violoncello, **Piano** (`sq_piano` — rests + chord symbols on staff; same piano MusicXML naming as Big Band).
- **Imports:** `quartetScoreBuilder` restores `SQ_PART_V1`–`SQ_PART_VC` for MIDI-bound lookups (regression fix).
- **Section markers:** statement, development, contrast, return, coda (rehearsal / form slices in export).
- **Chords / UI:** chord symbols on **piano** staff; **Generate** chord input wired for String Quartet (and Big Band).
- **Generate UI:** **Song Form** dropdown + 16/24/32 bar select aligned with duo/song flow; `formId` passed on the generate request.
- **Research backlog (not implemented yet):** Perplexity deep research on **string quartet style parameters** — local file `c:\Users\mike\Documents\Perplexity Research\string-quartet-parameters.txt` (alias: `string-quartet-parameters.md`). **When refreshing this roadmap or extending SQ styles,** use it to plan texture/harmony/era-style work; assistants should remind the user to implement from this source when roadmap discussions touch String Quartet depth.
- **Scope:** behavioural scoring — not full professional arranging.

---

## Current (as of roadmap date)

| Area | State |
|------|--------|
| **Duo / ECM / Song Mode / Riff / Wyble** | Shipping **MusicXML** path; validation + receipts; chord diagnostics (#17) |
| **Phase 18.2D** | **Complete** (bass phrase intelligence + regression sweeps); **18.2E** **Complete** (gates + bass export) |
| **Phase 19** | **Complete** (UI ≤32 bars); longer forms not fully in UI |
| **Song Mode D-phase** | **D1** + C1–C7: **done** per architecture; **D2** (groove / space / expression / surprise → receipt): **done** per [CHANGELOG.md](CHANGELOG.md); **D3** reserved |
| **Songwriters & arrangers (Song Mode)** | **Core:** typed ids, **`songwriterRuleRegistry`**, **`resolveSongwritingStyles`**, **`stylePairingResolver`**, **`buildCompiledSong`** — **done**. **Generate UI:** primary/secondary/author/classical + arranger pairing exposure still **thin vs engine** (see Future → style exposure + pairing). |
| **Vocal lead sheet (Song Mode)** | Bridge + checkbox **wired**; **app receipt / download path incomplete** — align **`CompiledSong`** → Python input (see [CHANGELOG.md](CHANGELOG.md) 2026-04-10). |
| **Wyble Voice 2** | **Inject** extended to **single-line** duo family; other passes may still use stricter `guitar_bass_duo` checks — see **Future → next possible devs** |
| **Big Band + String Quartet — follow-ups** | **Chord input** + **Song Form** + **bar-length select** (16/24/32) wired; **piano** export naming (Sibelius-friendly) — see [CHANGELOG.md](CHANGELOG.md) |
| **Python engines** (`engines/wayne-shorter-engine`, `shorter-form-engine`, etc.) | **Not** integrated into Composer OS TS Generate path |
| **#19 / #16 / #17 (chord track)** | **Baseline complete** — unified semantics (#19), robustness baseline + export/receipt behaviour (#16), diagnostics in UI (#17). Aligned across [README.md](../README.md) and [docs/CHANGELOG.md](./CHANGELOG.md). |

---

## Future (prioritized directions)

### Next possible devs (pick list)

| # | Dev | Notes |
|---|-----|--------|
| 1 | **Wyble single-line parity (full stack)** | Align **`stabiliseGuitarVoice2Wyble18_2B_*`** and any remaining **`presetId === 'guitar_bass_duo'`** guards with **`isGuitarBassDuoFamily`** where behaviour should match inject; add **`test:duo` / single-line** seed if missing. |
| 2 | **Wyble “realized” normalization review** | `normalizeRealizedVoice2PostInjection182B3` skips **`guitar_bass_duo`** while the stabiliser wrapper targets duo — confirm intent; optionally unify so metrics/validators match single-line + standard duo. |
| 3 | **Wyble Etude / product preset** | Today “Wyble” is mostly inner voice on duo; optional **`wyble_etude`** (or flag) for study mode, stricter rules, or dedicated release metadata row. |
| 4 | **Phase 19.1 — longer forms in UI** | Engine paths exist for some extended lengths; expose **>32 bars** where supported + validation. |
| 5 | **Wayne Shorter integration** | Deepen TS pipeline: **`shorterMode`**, style modules, or UI; keep distinct from Python **`wayne-shorter-engine`**. |
| 6 | **Big Band / String Quartet polish** | Rehearsal copy, host import smoke tests, optional extra **`formId`** presets. |
| 7 | **Song Mode — style exposure** | Surface **primary / secondary songwriter**, **author** + **classical** overlays, and optional **songwriter × arranger** pairing in Generate; align with **`songwriterStyleResolver`** / **`stylePairingResolver`**. Also surface **`styleStack`** or named presets beyond current defaults where applicable. |
| 12 | **Vocal lead sheet — pipeline** | Close **CompiledSong → bridge** shape gap so vocal MusicXML appears in app receipts/downloads (see CHANGELOG 2026-04-10). |
| 8 | **18.2D / bass regression expansion** | More seeds, property tests, or CI hook for **`test:duo`** + **`test:bass`**. |
| 9 | **ECM / Barry Harris / Bacharach** | Implement from **`ECM_Bacharach_BarryHarris_Research.md`** when extending chamber feel or style stacks. |
| 10 | **Slonimsky / pattern lines** | Melodic substitution or line tools from **`Slonimsky Engine.md`**. |
| 11 | **Chord UX polish** | Rarer symbols, help text, parse-error tests; does **not** reopen #16 baseline. |

### Near term (high leverage)

1. **Wayne Shorter “engine integration” (product meaning)** — deepen **Composer OS** integration: style modules, duo grammar, or UI surfacing; distinguish from standalone Python `wayne-shorter-engine`.
2. **Big Band + String Quartet polish:** rehearsal/section copy, host-specific import smoke tests; optional **form** presets beyond current `formId` set.
3. **Song Mode diversity:** expose **songwriter / arranger / overlay** controls and **`styleStack`** (or presets) in UI; **D2** receipt path — **done**; next: diversity presets / advanced intent; **vocal lead sheet** end-to-end once pipeline matches bridge input.
4. **Wyble parity + quality** — full single-line stack alignment; expressive/rhetorical refinement (rhythm, phrasing, lower voice).

### Medium term

- **Voice 2:** Phase **18.2B.3**-style melodic imitation / counterpoint refinement; **realized** metrics alignment (see table above).
- **Phase 19.1** — forms **>32 bars** in UI where engine supports.
- **Chord handling (optional polish)** — rarer lead-sheet symbols, clearer in-app help / parse errors, and extra regression tests across presets/hosts; **does not reopen #16** (baseline marked **DONE** in README + docs/CHANGELOG).

### Longer term / explicit non-goals until designed

- **D3** — undefined control surface.
- **Full** Python composer engines inside Electron without a bridge strategy.
- **creative-rule-engines** repo split — engine definitions live there per root README policy.

---

## Related paths

| Doc / code | Role |
|------------|------|
| [CHANGELOG.md](CHANGELOG.md) | Dated entries, phase completions |
| [README.md](../README.md) | Product narrative, phase summaries |
| [COMPOSER_OS_ARCHITECTURE.md](COMPOSER_OS_ARCHITECTURE.md) | C1–C7, D1–D3, pipeline diagram |
| `engines/composer-os-v2/app-api/releaseMetadata.ts` | Honest capability matrix |
| `docs/COMPOSER_OS_ROADMAP.md` | This roadmap (update title date when refreshing) |
| `engines/composer-os-v2/core/song-mode/songwritingResearchTypes.ts` | Songwriter / author / classical rule ids |
| `engines/composer-os-v2/core/song-mode/songwriterRuleRegistry.ts` | Per-id rule bundles (writers + arrangers) |
| `engines/composer-os-v2/core/song-mode/songwriterStyleResolver.ts` | Primary + secondary + overlays → resolved rules + blended profile |
| `engines/composer-os-v2/core/style-pairing/stylePairingResolver.ts` | Songwriter × arranger pairing + era heuristics |
| `engines/composer-os-v2/core/song-mode/songModeBuilder.ts` | **`buildCompiledSong`** — wires resolution + optional **`stylePairing`** |
| `engines/songwriting_bridge/cli_export_lead_sheet.py` | Optional vocal lead sheet export (Song Mode) |
| `c:\Users\mike\Documents\Perplexity Research\string-quartet-parameters.txt` | **Future:** Perplexity research — string quartet style parameters to implement when SQ preset gains richer stylistic control (see String Quartet section above) |
| `c:\Users\mike\Documents\Perplexity Research\jazz-era.md` | **Future:** Perplexity research — jazz era / style reference for Big Band and broader jazz presets (see Big Band section above) |
| `c:\Users\mike\Documents\Perplexity Research\BigBandResearch.md` | **Future:** Perplexity research — Big Band arranging / composer vocabulary (see Big Band section; align with `engines/composer-os-v2/core/big-band/`) |
| `c:\Users\mike\Documents\Perplexity Research\Slonimsky Engine.md` | **Future:** Perplexity research — Slonimsky / pattern systems for lines and melodic tooling (see Other presets / research backlog above) |
| `c:\Users\mike\Documents\Perplexity Research\ECM_Bacharach_BarryHarris_Research.md` | **Future:** Perplexity research — ECM, Bacharach, Barry Harris (see Foundation & export / ECM research backlog above) |

---

*End of Composer OS Roadmap [2026-04-10].*

